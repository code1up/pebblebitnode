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

        res.redirect(client.authorizeUrl(token));
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
    console.log("access token: %s", req.query.access_token);
    console.log("access token secret: %s", req.query.access_token_secret);

    var accessToken = req.query.access_token || req.session.oauth.accessToken;
    var accessTokenSecret = req.query.access_token_secret || req.session.oauth.accessTokenSecret;

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

        var stringifiedPayload = JSON.stringify(payload);

        if (req.session.oauth.pebble) {
            // Transfer payload to Pebble.
            var baseUri = "pebblejs://close#";
            var encodedPayload = encodeURIComponent(stringifiedPayload);

            window.location.href = baseUri + encodedPayload;

        } else {
            // Return payload as JSON.
            res.setHeader("content-type", "application/json");
            res.end(stringifiedPayload);
        }
    });
});

app.listen(process.env.PORT || 3000);
