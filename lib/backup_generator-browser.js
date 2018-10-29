var async = require('async');
var _ = require('lodash');
var fs = require('fs');
var brandingLogo = require('./branding-logo');
var QRCode = require('./qrCode-browser');
var PdfWriter = require('./pdf_writer');
var bowser = require('bowser');

/**
 * @param identifier            string          identifier
 * @param backupInfo            object
 * @param extraInfo             array
 * @param options
 * @constructor
 */
var BackupGenerator = function(identifier, backupInfo, extraInfo, options) {
    var self = this;

    backupInfo = backupInfo || {};
    extraInfo = extraInfo || {};
    options = options || {};

    self.identifier = identifier;
    self.backupInfo = backupInfo;
    self.extraInfo = extraInfo;
    self.network = options.network || "Bitcoin";
    self.options = _.merge({page1: true, page2: true, page3: true, brandingLogo: brandingLogo}, options);
    self.blocktrailPublicKeys = [];

    if (backupInfo.blocktrailPublicKeys) {
        _.each(backupInfo.blocktrailPublicKeys, function(pubKey, keyIndex) {
            self.blocktrailPublicKeys.push({
                keyIndex: keyIndex,
                pubKey:   pubKey,
                path:     "M/" + keyIndex + "'"
            });
        });
    }
};

/**
 * determine if current browser supports the saveAs for the PDF backup
 *
 * @return {boolean}
 */
BackupGenerator.saveAsSupported = function() {
    // a whole bunch of mobile OSs that are unsupported
    if (bowser.browser.ios || bowser.browser.blackberry || bowser.browser.firefoxos ||
        bowser.browser.webos || bowser.browser.bada || bowser.browser.tizen || bowser.browser.sailfish) {
        return false;
    }

    if (bowser.browser.android) {
        if (!bowser.browser.chrome) {
            return false;
        }

        if (bowser.browser.version.split('.')[0] < 41) {
            return false;
        }

        // not sure if this is required if the chrome version is >= 41
        if (bowser.browser.osversion.split('.')[0] <= 4) {
            return false;
        }
    }

    return true;
};

/**
 * create an HTML version of the backup document
 *
 */
BackupGenerator.prototype.generateHTML = function(cb) {
    var self = this;

    var data = {
        identifier: self.identifier,
        backupInfo: self.backupInfo,
        totalPubKeys: self.blocktrailPublicKeys.length,
        pubKeysHtml: "",
        extraInfo: _.map(self.extraInfo, function(value, key) {
            if (typeof value !== "string") {
                return value;
            } else {
                return {
                    title: key,
                    value: value
                };
            }
        }),
        options: self.options
    };

    async.forEach(Object.keys(self.blocktrailPublicKeys), function(keyIndex, cb) {
        var pubKey = self.blocktrailPublicKeys[keyIndex];

        QRCode.toDataURL(pubKey.pubKey.toBase58(), {
            errorCorrectLevel: 'medium'
        }, function(err, dataURI) {
            pubKey.qr = dataURI;
            cb(err);
        });
    }, function(err) {
        if (err) {
            return cb(err);
        }

        _.each(self.blocktrailPublicKeys, function(pubKey) {
            data.pubKeysHtml += "<figure><img src='" + pubKey.qr + "' /><figcaption>";
            data.pubKeysHtml += "<span>KeyIndex: " + pubKey.keyIndex + " </span> ";
            data.pubKeysHtml += "<span>Path: " + pubKey.path + "</span>";
            data.pubKeysHtml += "</figcaption></figure>";
        });

        //load and compile the html
        var compiledHtml;
        try {
            compiledHtml = _.template(fs.readFileSync(__dirname + "/resources/backup_info_template.html", {encoding: 'utf8'}));
        } catch (e) {
            return cb(e);
        }

        cb(null, compiledHtml(data));
    });
};

/**
 * create a PDF version of the backup document
 */
BackupGenerator.prototype.generatePDF = function(callback) {
    /* jshint -W101 */
    var self = this;

    var pdf = new PdfWriter();

    var pageTop = function() {
        pdf.YAXIS(30); // top margin
        pdf.IMAGE(
            brandingLogo,
            'jpeg',
            154,
            30
        );
    };

    try {
        pdf.setFont('helvetica'); // default font

        pageTop();

        async.series([
            /**
             * page 1
             */
            function(callback) {
                if (self.options.page1) {
                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT(self.network + " Wallet Recovery Data Sheet");
                    });

                    pdf.TEXT(
                        "This document holds the information and instructions required for you to recover your BTC Wallet should anything happen. \n" +
                        "Print it out and keep it in a safe location; if you lose these details you will never be able to recover your wallet."
                    );

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Identifier (" + self.backupInfo.walletVersion + ")");
                        pdf.HR(0, 0);
                    });

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT(self.identifier);
                        });
                    });

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Backup Info");
                        pdf.HR(0, 0);
                    });

                    if (self.backupInfo.primaryMnemonic) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Primary Mnemonic");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.primaryMnemonic);
                            });
                        });
                    }

                    if (self.backupInfo.backupMnemonic) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Backup Mnemonic");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.backupMnemonic);
                            });
                        });
                    }

                    if (self.backupInfo.encryptedPrimarySeed) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Encrypted Primary Seed");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.encryptedPrimarySeed);
                            });
                        });
                    }

                    if (self.backupInfo.backupSeed) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Backup Seed");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.backupSeed);
                            });
                        });
                    }

                    if (self.backupInfo.recoveryEncryptedSecret) {
                        pdf.FONT_SIZE_SUBHEADER(function() {
                            pdf.TEXT_COLOR_GREY(function() {
                                pdf.TEXT("Encrypted Recovery Secret");
                            });
                            pdf.YAXIS(5);
                            pdf.FONT_SIZE_NORMAL(function() {
                                pdf.TEXT(self.backupInfo.recoveryEncryptedSecret);
                            });
                        });
                    }

                    pdf.NEXT_PAGE();
                    pageTop();
                    pdf.YAXIS(10); // need a little extra margin for QR codes

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT("BTC Wallet Public Keys");
                        });
                        pdf.FONT_SIZE_NORMAL(function() {
                            pdf.TEXT(self.blocktrailPublicKeys.length + " in total");
                        });
                    });
                    pdf.YAXIS(20);

                    async.forEach(Object.keys(self.blocktrailPublicKeys), function(keyIndex, cb) {
                        var pubKey = self.blocktrailPublicKeys[keyIndex];

                        QRCode.toDataURL(pubKey.pubKey.toBase58(), {
                            errorCorrectLevel: 'medium'
                        }, function(err, dataURI) {
                            pubKey.qr = dataURI;
                            cb(err);
                        });
                    }, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        var qrSize = 180;
                        var qrSubtitleheight = 20;

                        Object.keys(self.blocktrailPublicKeys).forEach(function(keyIndex, i) {
                            var pubKey = self.blocktrailPublicKeys[i];

                            var x = i % 3;

                            // move the yPos back up
                            if (i > 0 && x !== 0) {
                                pdf.YAXIS(-qrSize);
                                pdf.YAXIS(-3);
                            }

                            pdf.IMAGE(pubKey.qr, 'jpeg', qrSize, qrSize, x * qrSize);
                            pdf.YAXIS(3);
                            pdf.FONT_SIZE_SMALL(function() {
                                pdf.TEXT("KeyIndex: " + pubKey.keyIndex + " Path: " + pubKey.path, (x * qrSize) + 20, false);
                            });
                        });
                        pdf.YAXIS(qrSubtitleheight);

                        if (self.extraInfo) {
                            _.each(self.extraInfo, function(value, key) {
                                var title;
                                var subtitle;

                                if (typeof value !== "string") {
                                    title = value.title;
                                    subtitle = value.subtitle;
                                    value = value.value;
                                } else {
                                    title = key;
                                    // value = value;
                                }

                                pdf.FONT_SIZE_SUBHEADER(function() {
                                    pdf.TEXT_COLOR_GREY(function() {
                                        pdf.TEXT(title);
                                    });
                                    if (subtitle) {
                                        pdf.FONT_SIZE_SMALL(function() {
                                            pdf.TEXT_COLOR_LIGHT_GREY(function() {
                                                pdf.TEXT(subtitle);
                                            });
                                        });
                                    }
                                    pdf.YAXIS(3);
                                    pdf.FONT_SIZE_NORMAL(function() {
                                        pdf.TEXT(value);
                                    });
                                });
                            });
                        }

                        callback();
                    });
                } else {
                    callback();
                }
            },
            function(callback) {
                if (self.backupInfo.encryptedSecret && self.options.page2) {
                    if (self.options.page1) {
                        pdf.NEXT_PAGE();
                        pageTop();
                    }

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Backup Info - part 2");
                        pdf.HR(0, 0);
                    });

                    pdf.TEXT("This page needs to be replaced / updated when wallet password is changed!");

                    pdf.FONT_SIZE_SUBHEADER(function() {
                        pdf.TEXT_COLOR_GREY(function() {
                            pdf.TEXT("Password Encrypted Secret");
                        });
                        pdf.YAXIS(5);
                        pdf.FONT_SIZE_NORMAL(function() {
                            pdf.TEXT(self.backupInfo.encryptedSecret);
                        });
                    });
                }

                callback();
            },
            function(callback) {
                if (self.options.page3) {
                    // save some paper
                    // pdf.NEXT_PAGE();
                    // pageTop();

                    pdf.FONT_SIZE_HEADER(function() {
                        pdf.TEXT("Wallet Recovery Instructions");
                        pdf.HR(0, 0);
                    });

                    pdf.TEXT(
                        "You can recover the bitcoins in your wallet on https://recovery.blocktrail.com using this backup sheet.\n" +
                        "For a more technical aproach on how to recover your wallet yourself, " +
                        "see the 'wallet_recovery_example.php' script in the examples folder of the Blocktrail SDK."
                    );
                }

                callback();
            }
        ], function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, pdf.doc);
        });
    } catch (e) {
        callback(e);
        return;
    }
};

module.exports = BackupGenerator;
