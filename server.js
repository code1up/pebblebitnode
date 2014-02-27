var Fitbit = require("fitbit");
var express = require("express");

var app = express();

app.use(express.cookieParser());

app.use(express.session({
    secret: "pebblebitshh"
}));

var FITBIT_CONSUMER_KEY = "759003fc52444dfeb1248a7bb8d176c6";
var FITBIT_CONSUMER_SECRET = "b3ac0782601448ae93522b49ef74e41b";

app.get("/", function (req, res) {
    var client = new Fitbit(FITBIT_CONSUMER_KEY, FITBIT_CONSUMER_SECRET);
    var pebble = req.query.pebble === "1";

    client.getRequestToken(function (err, token, tokenSecret) {
        if (err) {
            // TODO: take action.
            return;
        }

        req.session.oauth = {
            pebble: pebble,
            requestToken: token,
            requestTokenSecret: tokenSecret
        };

        var authorizeUrl = client.authorizeUrl(token) + "&display=touch";

        res.redirect(authorizeUrl);
    });
});

app.get("/callback", function (req, res) {
    var verifier = req.query.oauth_verifier;
    var oauthSettings = req.session.oauth;
    var client = new Fitbit(FITBIT_CONSUMER_KEY, FITBIT_CONSUMER_SECRET);

    client.getAccessToken(
        oauthSettings.requestToken,
        oauthSettings.requestTokenSecret,
        verifier,
        function (err, token, secret) {
            if (err) {
                // TODO: take action.
                return;
            }

            oauthSettings.accessToken = token;
            oauthSettings.accessTokenSecret = secret;

            res.redirect("/steps");                
        }
    );
});

app.get("/steps", function (req, res) {
    var oauth = req.session.oauth;

    var pebble = (req.query.pebble === 1) || ((oauth && oauth.pebble)) === 1);
    var accessToken = req.query.access_token || (oauth && oauth.accessToken);
    var accessTokenSecret = req.query.access_token_secret || (oauth && oauth.accessTokenSecret);

    console.log("pebble: %d", pebble);
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

    client.getActivities(function (err, activities) {
        if (err) {
            // TODO: take action.
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

app.listen(process.env.PORT || 3000);
