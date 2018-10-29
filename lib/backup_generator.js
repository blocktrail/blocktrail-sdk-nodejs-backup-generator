var _ = require('lodash');
var htmlToFile = require('html-pdf');
var qrcode = require('qrcode-js/lib/qrcode.js');
var fs = require('fs');
var brandingLogo = require('./branding-logo');

var qrCode = function(text, size, typeNumber, errorCorrectLevel) {
    var qr = qrcode(typeNumber || 4, errorCorrectLevel || 'L');
    qr.addData(text);
    qr.make();
    var base64 = qr.createImgBase64(size);
    var dataURL = 'data:image/gif;base64,' + base64;

    return dataURL;
};

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

    self.identifier = identifier;
    self.backupInfo = backupInfo;
    self.extraInfo = extraInfo;
    self.options = _.merge({page1: true, page2: true, page3: true}, options);
    self.blocktrailPublicKeys = [];

    if (backupInfo.blocktrailPublicKeys) {
        _.each(backupInfo.blocktrailPublicKeys, function(pubKey, keyIndex) {
            self.blocktrailPublicKeys.push({
                keyIndex: keyIndex,
                pubKey: pubKey,
                path: "M/" + keyIndex + "'",
                qr: qrCode(pubKey.toBase58(), 3, 10)
            });
        });
    }
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
        network: self.network,
        extraInfo: _.map(self.extraInfo, function(value, key) {
            if (typeof value !== "string") {
                return value;
            } else {
                return {
                    title: key,
                    value: value,
                    subtitle: null
                };
            }
        }),
        options: self.options
    };

    _.each(self.blocktrailPublicKeys, function(pubKey) {
        data.pubKeysHtml += "<figure><img src='" + pubKey.qr + "' /><figcaption>";
        data.pubKeysHtml += "<span>KeyIndex: " + pubKey.keyIndex + " </span> ";
        data.pubKeysHtml += "<span>Path: " + pubKey.path + "</span>";
        data.pubKeysHtml += "</figcaption></figure>";
    });

    //load and compile the html
    var compiledHtml;
    try {
        compiledHtml =  _.template(fs.readFileSync(__dirname + "/resources/backup_info_template.html", {encoding: 'utf8'}));
    } catch (e) {
        return cb(e);
    }

    cb(null, compiledHtml(data));
};


/**
 * create file/stream of the backup document
 *
 */
BackupGenerator.prototype.generateBackup = function(options, filename, callback) {
    var self = this;
    self.generateHTML(function(err, html) {
        if (err) {
            callback(err);
            return;
        }

        if (typeof filename === 'undefined' || filename === null || filename === "") {
            htmlToFile.create(html, options).toBuffer(callback);
        } else {
            htmlToFile.create(html, options).toFile(filename, callback);
        }
    });
};

/**
 * create a PDF version of the backup document
 */
BackupGenerator.prototype.generatePDF = function(filename, callback) {
    /* jshint -W101 */
    var options = {
        format: "Letter",           // allowed units: A3, A4, A5, Legal, Letter, Tabloid
        orientation: "portrait",    // portrait or landscape

        // Page options
        border: "10mm",                // default is 0, units: mm, cm, in, px
        header: {
            height: "18mm",
            contents: '<div style="text-align: right;"><a class="logo-blocktrail-square" href="https://www.blocktrail.com/"><img src="' + brandingLogo + '"  alt="blocktrail" /></a></div>'
        },
        footer: {
            height: "12mm",
            contents: '<div style="float:right; font-size: 0.85em; color: #666;"><span style="color: #444;">{{page}}</span>/<span>{{pages}}</span></div>'
        },

        // File options
        type: "pdf"                 // allowed file types: png, jpeg, pdf
    };

    this.generateBackup(options, filename, callback);
};

module.exports = BackupGenerator;
