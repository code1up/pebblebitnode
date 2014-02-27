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

    client.getRequestToken(function (err, token, tokenSecret) {
        if (err) {
            // TODO: take action.
            return;
        }

        req.session.oauth = {
            requestToken: token,
            requestTokenSecret: tokenSecret
        };

        res.redirect(client.authorizeUrl(token));
    });
});

app.get("/oauth_callback", function (req, res) {
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

            console.dir(oauthSettings);

            res.redirect("/stats");
        }
    );
});

app.get("/stats", function (req, res) {
    client = new Fitbit(
        FITBIT_CONSUMER_KEY,
        FITBIT_CONSUMER_SECRET, {
            accessToken: req.session.oauth.accessToken,
            accessTokenSecret: req.session.oauth.accessTokenSecret,
            unitMeasure: "en_GB"
        }
    );

    client.getActivities(function (err, activities) {
        if (err) {
            // TODO: take action.
            return;
        }

        res.send("Total steps today: " + activities.steps());
    });
});

app.listen(3000);
