// TODO: use headers to pass keys.
// TODO: ensure HTTPS locally and on the server.
// TODO: move API keys into config module.

var express = require("express");
var Fitbit = require("fitbit");
var querystring = require("querystring");

var app = express();

app.use(express.cookieParser());

app.use(express.session({
    secret: "pebblebitshh"
}));

var TRUTHY = "1";
var FALSY = "0";

var FITBIT_CONSUMER_KEY = "759003fc52444dfeb1248a7bb8d176c6";
var FITBIT_CONSUMER_SECRET = "b3ac0782601448ae93522b49ef74e41b";

var redirectError = function (req, res, error) {
    console.log("----> redirectError()");

    var qs = querystring.stringify({
        error: error
    });

    var errorUrl = "/error?" + qs;

    res.redirect(errorUrl);
};

app.get("/", function (req, res) {
    console.log("----> GET:/");

    var client = new Fitbit(FITBIT_CONSUMER_KEY, FITBIT_CONSUMER_SECRET);
    var pebble = req.query.pebble === TRUTHY;

    // CRITICAL: destroy any OAuth tokens etc. from session state.
    req.session.oauth = null;

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

        console.log("oauth: %j", req.session.oauth);

        var qs = querystring.stringify({
            display: "touch"
        });

        var authorizeUrl = client.authorizeUrl(requestToken) + "&" + qs;

        res.redirect(authorizeUrl);
    });
});

app.get("/callback", function (req, res) {
    console.log("----> GET:/callback");

    var verifier = req.query.oauth_verifier;
    var oauth = req.session.oauth;

    console.log("oauth: %j", oauth);

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

            console.log("oauth: %j", oauth);

            var qs = querystring.stringify({
                pebble: oauth.pebble ? TRUTHY : FALSY
            });

            var stepsUrl = "/steps?" + qs;

            res.redirect(stepsUrl);
        }
    );
});

app.get("/steps", function (req, res) {
    console.log("----> GET:/steps");

    var oauth = req.session.oauth;

    console.log("oauth: %j", oauth);

    var pebble = req.query.pebble === TRUTHY;
    var accessToken = req.query.access_token || (oauth && oauth.accessToken);
    var accessTokenSecret = req.query.access_token_secret || (oauth && oauth.accessTokenSecret);

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
            var escapedPayload = querystring.escape(JSON.stringify(payload));

            res.redirect(pebbleUrl + escapedPayload);

        } else {
            // Return payload as JSON.
            res.json(payload);
        }
    });
});

app.get("/error", function (req, res) {
    res.json(req);
});

app.listen(process.env.PORT || 3000);
