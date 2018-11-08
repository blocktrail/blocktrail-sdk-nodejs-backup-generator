/* global window */
/* jshint -W101, -W098 */
var BackupGenerator = require('../');
var assert = require('assert');
var brandingLogo = require('../lib/branding-logo');

// hacky implementation of object that serializes to base58
// avoids unnecessary dependencies
var HdKey = function(xpub) {
    this.xpub = xpub;
};
HdKey.prototype.toBase58 = function() {
    return this.xpub;
};

var V2BackupInfo = {
    "encryptedPrimarySeed": "fat arena brown skull echo question abandon abandon abandon abandon abandon absurd license gain sentence obey give coconut woman sunny winner attitude nephew come coyote cannon dust fall blouse ring seed latin theory bag tank average asthma wisdom tennis will minor extra leg image curtain anxiety limit reward",
    "backupSeed": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon give arch suspect turtle already razor night magic",
    "recoveryEncryptedSecret": "fat arena brown skull echo question abandon abandon abandon abandon abandon abandon flower display fence copper add require sound vague upset hour drift figure guess iron bird thought sort sign bid total tiger burger balance opera energy burst still damp same pepper embody property caution glimpse struggle fossil",
    "encryptedSecret": "fat arena brown skull echo question abandon abandon abandon abandon abandon account advice amazing chair gain crystal random away barrel jewel photo over rookie recipe twin jar heart spirit poverty prison also movie entry speak tooth dutch snake ring school play segment action brand business unknown code kitten",
    "blocktrailPublicKeys": {
        "9999": new HdKey("tpubD9q6vq9zdP3gbhpjs7n2TRvT7h4PeBhxg1Kv9jEc1XAss7429VenxvQTsJaZhzTk54gnsHRpgeeNMbm1QTag4Wf1QpQ3gy221GDuUCxgfeZ")
    }
};

var V3BackupInfo = {
    "encryptedPrimarySeed":"library exotic abandon abandon abandon abandon abandon abandon abandon amount abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon aunt jelly ostrich twice salute crowd picnic proof asthma embrace emerge piece melt thought magnet pave exact almost trip inhale laugh sort few auto panic indoor wheel way vintage sock title else coconut define device absorb repair",
    "backupSeed":"abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon give arch suspect turtle already razor night magic",
    "recoveryEncryptedSecret":"library exotic abandon abandon abandon abandon abandon abandon absent session abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon again code garbage sell arrow forget foam rotate aerobic thunder produce work task decade potato drill scan desert write immune critic dumb flame need ceiling cradle page focus donkey amount virus coin icon settle wedding bone clock",
    "encryptedSecret":"library exotic abandon abandon abandon abandon abandon abandon absent session abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon all page interest tragic small good winter plate review ensure misery genre grid clarify until need affair level grocery find bus change mean popular vapor chapter color bean caught transfer soup bounce soon exact slogan club hold",
    "blocktrailPublicKeys": {
        "9999": new HdKey("tpubD9q6vq9zdP3gbhpjs7n2TRvT7h4PeBhxg1Kv9jEc1XAss7429VenxvQTsJaZhzTk54gnsHRpgeeNMbm1QTag4Wf1QpQ3gy221GDuUCxgfeZ")
    }
};

describe('BackupGenerator', function() {
    var fixtureData = [
        {version: "2", data: V2BackupInfo},
        {version: "3", data: V3BackupInfo}
    ];

    describe('generateHTML', function() {
        fixtureData.map(function(testFixture) {
            it('works for v' + testFixture.version, function(cb) {
                var generator = new BackupGenerator("wallet-identifier-for-test", testFixture.data, [], {});
                generator.generateHTML(function(err, html) {
                    assert.ifError(err);
                    assert.ok(html);
                    assert.ok(-1 !== html.indexOf(brandingLogo));
                    assert.ok(-1 !== html.indexOf(testFixture.data.encryptedPrimarySeed));
                    assert.ok(-1 !== html.indexOf(testFixture.data.backupSeed));
                    assert.ok(-1 !== html.indexOf(testFixture.data.recoveryEncryptedSecret));
                    assert.ok(-1 !== html.indexOf(testFixture.data.encryptedSecret));

                    // need to extract div class 'blocktrail-pubkeys' to determine if correct pubkey was embedded
                    //assert.ok(-1 !== html.indexOf(testFixture.data.blocktrailPublicKeys["9999"].toBase58()));
                    assert.ok(-1 !== html.indexOf("M/9999'"));
                    cb();
                });
            });
        });

        it('allows overriding default branding logo', function(cb) {
            var newLogo = "data:image/png;base64,XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
            var generator = new BackupGenerator("wallet-identifier-for-test", V2BackupInfo, [], {
                brandingLogo: newLogo
            });
            generator.generateHTML(function(err, html) {
                assert.ifError(err);
                assert.ok(html);
                assert.ok(-1 === html.indexOf(brandingLogo));
                assert.ok(-1 !== html.indexOf(newLogo));
                assert.ok(-1 !== html.indexOf(V2BackupInfo.encryptedPrimarySeed));
                assert.ok(-1 !== html.indexOf(V2BackupInfo.backupSeed));
                assert.ok(-1 !== html.indexOf(V2BackupInfo.recoveryEncryptedSecret));
                assert.ok(-1 !== html.indexOf(V2BackupInfo.encryptedSecret));

                // need to extract div class 'blocktrail-pubkeys' to determine if correct pubkey was embedded
                //assert.ok(-1 !== html.indexOf(testFixture.data.blocktrailPublicKeys["9999"].toBase58()));
                assert.ok(-1 !== html.indexOf("M/9999'"));
                cb();
            });
        });
    });

    describe('generatePDF', function() {
        fixtureData.map(function(testFixture) {
            it('works for v' + testFixture.version, function(cb) {
                var generator = new BackupGenerator("wallet-identifier-for-test", testFixture.data, [], {
                    network: "Bitcoin"
                });
                generator.generatePDF("/tmp/pdf", function(err, pdf) {
                    assert.ifError(err);
                    assert.ok(pdf);
                    cb();
                });
            });
        });
    });
});
