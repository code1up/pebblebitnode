var express = require("express");
var Fitbit = require("fitbit");
var querystring = require("querystring");

var TRUTHY = "1";
var FALSY = "1";

var app = express();

app.use(express.cookieParser());

app.use(express.session({
    secret: "pebblebitshh"
}));

var FITBIT_CONSUMER_KEY = "759003fc52444dfeb1248a7bb8d176c6";
var FITBIT_CONSUMER_SECRET = "b3ac0782601448ae93522b49ef74e41b";

var redirectError = function (req, res, error) {
    var qs = querystring.stringify({
        error: error
    });

    var errorUrl = "/error&" + qs;

    console.log("errorUrl: %s", errorUrl);

    res.redirect(errorUrl);
};

app.get("/", function (req, res) {
    var client = new Fitbit(FITBIT_CONSUMER_KEY, FITBIT_CONSUMER_SECRET);
    var pebble = req.query.pebble === TRUTHY;

    client.getRequestToken(function (error, requestToken, requestTokenSecret) {
        if (error) {
            redirectError(req, res, error);
            return;
        }

        req.session.oauth = {
            requestToken: requestToken,
            requestTokenSecret: requestTokenSecret,
            pebble: pebble
        };

        var qs = querystring.stringify({
            display: "touch"
        });

        var authorizeUrl = client.authorizeUrl(token) + "&" + qs;

        console.log("authorizeUrl: %s", authorizeUrl);

        res.redirect(authorizeUrl);
    });
});

app.get("/callback", function (req, res) {
    var verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    var client = new Fitbit(FITBIT_CONSUMER_KEY, FITBIT_CONSUMER_SECRET);

    client.getAccessToken(
        oauth.requestToken,
        oauth.requestTokenSecret,
        verifier,
        function (error, accessToken, accessTokenSecret) {
            if (error) {
                redirectError(req, res, error);                    
                return;
            }

            oauth.accessToken = accessToken;
            oauth.accessTokenSecret = accessTokenSecret;

            var qs = querystring.stringify({
                pebble: oauth.pebble ? TRUTHY : FALSY
            });

            var stepsUrl = "/steps&" + qs;

            res.redirect(stepsUrl);
        }
    );
});

app.get("/steps", function (req, res) {
    var oauth = req.session.oauth;

    var pebble = (req.query.pebble === TRUTHY) || (oauth && oauth.pebble);
    var accessToken = req.query.access_token || (oauth && oauth.accessToken);
    var accessTokenSecret = req.query.access_token_secret || (oauth && oauth.accessTokenSecret);

    console.log("pebble: %s", pebble);
    console.log("access token: %s", accessToken);
    console.log("access token secret: %s", accessTokenSecret);

    client = new Fitbit(
        FITBIT_CONSUMER_KEY,
        FITBIT_CONSUMER_SECRET, {
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret,
            unitMeasure: "en_GB"
        }
    );

    client.getActivities(function (error, activities) {
        if (error) {
            redirectError(req, res, error);            
            return;
        }

        var payload = {
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret,
            steps: activities.steps()
        };

        if (pebble) {
            // Return payload to Pebble as UTL fragment.
            var pebbleUrl = "pebblejs://close#";
            var encodedPayload = encodeURIComponent(JSON.stringify(payload));

            res.redirect(pebbleUrl + encodedPayload);

        } else {
            // Return payload as JSON.
            res.json(payload);
        }
    });
});

app.get("/error", function (req, res) {
    res.send("Something wonderful happened.");
});

app.listen(process.env.PORT || 3000);
