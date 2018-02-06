function ChaZD(queryWord, useHttps, wordSource, sendResponse) {
    
    this.wordSource = wordSource;
    this.useHttps = useHttps;
    
    var str1 = api.appKey + queryWord + api.salt + api.appSecret;
    var sign =  hexmd5(str1);

    var url = (useHttps ? urls.dictHttps : urls.dict) + sign + "&q=" + queryWord;

    // console.log("Query url: " + url);
    var queryResult = {};
    var self = this;
    var xhr = new XMLHttpRequest();

    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState != 4) {return;}
        var result = JSON.parse(xhr.responseText);
        if (queryWord.indexOf("-") !== -1 && !self.checkErrorCode(result.errorCode).error && !self.haveTranslation(result)) {
            //优化使用连字符的词的查询结果
            new ChaZD(queryWord.replace(/-/g, " "), useHttps, wordSource, sendResponse);
        } else {
            // alert("sender is " + JSON.stringify(result));
            var resultObj = self.parseResult.call(self, result);
            sendResponse(resultObj);
        }
    };
    xhr.send();
}

ChaZD.prototype.checkErrorCode = function (errorCode) {
    errorCode = parseInt(errorCode);
    var response = {
        "message": "",
        "error": 0,
        "errorCode": 0
    };
    switch (errorCode){
        case 0:
            response.message = "query success";
            break;
        case 20: 
            response.message = "要翻译的文本过长";
            response.error = 1;
            response.errorCode = 20;
            break;
        case 30:
            response.message = "无法进行有效的翻译";
            response.error = 1;
            response.errorCode = 30;
            break;
        case 40:
            response.message = "不支持的语言类型";
            response.error = 1;
            response.errorCode = 40;
            break;
        case 50:
            response.message = "无效的key";
            response.error = 1;
            response.errorCode = 50;
            break;
        case 60:
            response.message = "无辞典结果";
            response.error = 1;
            response.errorCode = 60;
            break;
        default:
    }
    return response;  
};

ChaZD.prototype.parseResult = function (result) {
    //console.log("Response Text: \n" + responseText);
    var resultObj = {};
    var validResult = this.checkErrorCode(result.errorCode);
    resultObj.haveWebTranslation = false;
    if (!validResult.error) {
        var title = this.initTitle(result);
        resultObj.titleBlock = title.titleBlock;
        resultObj.haveTranslation = this.haveTranslation(result);
        if (result.basic !== undefined) {
            var basicBlock = this.parseBasicResult(result);
            resultObj.basicBlock = basicBlock;
        }

        if (result.web !== undefined) {
            var webBlock = this.parseWebResult(result);
            resultObj.haveWebTranslation = true;
            resultObj.webBlock = webBlock;
        }
    } else {
        resultObj.errorCode = validResult.errorCode;
    }
        // alert("response from xhr: ");
    resultObj.validMessage = validResult.message;
    
    return resultObj;
};

ChaZD.prototype.haveTranslation = function (result) {
    if (this.checkErrorCode(result.errorCode).error) {
        return false;
    }
    var translation = result.translation;
    var queryWord = result.query;
    if (trim(queryWord.toLowerCase()) === trim(translation.toString().toLowerCase())) {
        return false;
    }
    return true;
};

ChaZD.prototype.initTitle = function (result) {
    var translation = result.translation;
    var queryWord = result.query;
    //console.log("[ChaZD] queryWord: %s, translation: %s.", queryWord, translation.toString());
    // var haveTranslation = true;
    // if (trim(queryWord.toLowerCase()) === trim(translation.toString().toLowerCase())) {
    //     haveTranslation = false;
    // }

    var voiceContainer = this.initVoice(queryWord);
    //console.log("word length:", queryWord.length);
    //console.log("word source:", this.wordSource);
    queryWord = queryWord.length >= 50 && this.wordSource == "select" ? this.shortWord(queryWord) : queryWord;

    //console.log("word:", queryWord);
    var titleWord = fmt(frame.titleWord, queryWord, voiceContainer);
    var titleTranslation = fmt(frame.titleTranslation, translation.toString());


    return {
        titleBlock : fmt(frame.titleContainer, titleWord,  titleTranslation, queryWord.length >=50 ? "long-text" : ""),
        //haveTranslation : haveTranslation
    };
};

ChaZD.prototype.shortWord = function (longWord) {
    return longWord.slice(0, longWord.lastIndexOf(" ", 50)).concat(" ...");
};

ChaZD.prototype.parseBasicResult = function (result) {
    var basic = result.basic;
    var queryWord = result.query;
    
    var phoneticBlock = this.parseBasicPhonetic(basic, queryWord);
    var explainsBlock = this.parseBasicExplains(basic, queryWord);

    var basicContainer = fmt(frame.basicContainer, phoneticBlock, explainsBlock);
    return basicContainer;
};

ChaZD.prototype.parseBasicPhonetic = function (basic, queryWord) {
    var ukPhonetic = basic["uk-phonetic"];
    var usPhonetic = basic["us-phonetic"];

    if (ukPhonetic !== undefined && usPhonetic !== undefined) {
        var ukVoice = this.initVoice(queryWord, 1);
        var ukPhoneticContainer = fmt(frame.ukPhoneticContainer, "[" + ukPhonetic + "]" + ukVoice);
    
        var usVoice = this.initVoice(queryWord, 2);
        var usPhoneticContainer = fmt(frame.usPhoneticContainer, "[" + usPhonetic + "]" + usVoice);

        return fmt(frame.phoneticContainer, ukPhoneticContainer, usPhoneticContainer);
    }
  
    return fmt(frame.phoneticContainer, "", "");
};

ChaZD.prototype.initVoice = function (queryWord, type) {
    var src = (this.useHttps ? urls.voiceHttps : urls.voice) + queryWord;
    if(type !== undefined) {
        src = src + "&type=" + type;
    }
    var title = ""; 
    if(type === 1){
        title = "英音";
    } else if (type === 2){
        title = "美音";
    } else {
        title = "真人发音";
    }

    return fmt(frame.voiceContainer, src, title);
};

ChaZD.prototype.parseBasicExplains = function (basic, queryWord) {
    var explains = basic.explains;
    var i;
    var explainsContent = "";
    for (i = 0; i < explains.length; i++) {
        var currentExplain = explains[i];
        
        var haveProperty = currentExplain.indexOf(". ");
        var property = (haveProperty !== -1) ? currentExplain.slice(0, haveProperty + 1) : "";
        var propertyTitle = this.parseProperty(property);
        var propertyContainer = fmt(frame.propertyContainer, propertyTitle, property);
        var explainText = (haveProperty !== -1) ? currentExplain.slice(haveProperty + 1) : currentExplain;
        
        var explain = fmt(frame.explain, propertyContainer, explainText);
        explainsContent += explain;
    } 
    
    return fmt(frame.explainsContainer, fmt(frame.explainsList, explainsContent));
};

ChaZD.prototype.parseProperty = function (property) {
    var propertyText = "";
    switch (property) {
        case "adj." :
            propertyText = "形容词";
            break;
        case "adv." :
            propertyText = "副词";
            break;
        case "n." : 
            propertyText = "名词";
            break;
        case "vi." :
            propertyText = "不及物动词";
            break;
        case "vt." :
            propertyText = "及物动词";
            break;
        case "prep." :
            propertyText = "介词";
            break;
        case "conj." :
            propertyText = "连词";
            break;
        case "int." :
            propertyText = "感叹词";
            break;
        case "abbr." :
            propertyText = "代词";
            break;
        case "pron." :
            propertyText = "";
            break;
        default :
    }

    return propertyText;
};



ChaZD.prototype.parseWebResult = function (result) {
    var web = result.web;
    var webExplainsContent = "";
    var i;
    for (i = 0; i < web.length ; i++) {
        var webExplain = fmt(frame.webExplain, web[i].key, web[i].value);
        webExplainsContent += webExplain;
    }

    return fmt(frame.webExplainsContainer, fmt(frame.webExplainsList, webExplainsContent));
};

//字符串预处理，解析驼峰命名法和下划线命名法的单词、词组
function preprocessWord (originWord) {
    if (originWord.indexOf(" ") === -1) {
        originWord = originWord.replace(/_/g, " ");
        if (/[a-z]+/.test(originWord)) {
            originWord = trim(originWord.replace(/([A-Z])/g, " $1"));
        }
    }
    return originWord;
}

/*
ChaZD.prototype.parsePhrase = function (queryWord, key) {
    var words = [];
    words = queryWord.split(/\s+/);
}
*/
window.Notifications = window.Notifications || window.webkitNotifications;

function showNotification(note) {
    if (!Notifications) {
        //console.log("[ChaZD] Your browse don't support notification.");
        return;
    }
    var notification = null, havePermission = Notifications.checkPermission();
    if (havePermission === 0) {
        notification = Notifications.createNotification(
            note.icon || chrome.extension.getURL("icons/icon128.png"),
            note.title || "ChaZD 查字典",
            note.content
        );
        notification.onclick = function () {
            window.open("https://chrome.google.com/webstore/detail/chazd/nkiipedegbhbjmajlhpegcpcaacbfggp");
        };
        notification.show();
    } else {
        Notifications.requestPermission();
    }

    return notification;
}

chrome.runtime.onInstalled.addListener(
    function (details) {
        if (details.reason === "install") {
            //console.log("[ChaZD] first install.");
            showNotification({
                title : "感谢支持 ChaZD ！",
                content : "ChaZD 力求成为最简洁易用的 Chrome 词典扩展，欢迎提出您的意见或建议。" + 
                    "如果觉得 ChaZD 还不错，记得给5星好评哦:)"
            });
            //alert("Thank you for install my app:)");
        } else if (details.reason === "update") {
            //console.log("[ChaZD] update from version " + details.previousVersion);
            //alert("New version has updated!");
            chrome.storage.sync.set({"showTips" : true}, function() {
                //console.log("[ChaZD] Success update settings selectMode = mouseSelect");
            });
            showNotification({
                title : "ChaZD 更新到0.8.19版！",
                content : "修复若干 bug，如出现无法查词的问题，请在设置中关闭使用 HTTPS 接口"                          
            });
        }
    }
);

// chrome.contextMenus.create({"title": "在此页面禁用 ChaZD", "id": "deniedPage"});
// chrome.contextMenus.create({"title": "在此站点禁用 ChaZD", "id": "deniedSite"});
// chrome.contextMenus.create({"title": "管理禁用列表", "id": "deniedList"});
// chrome.contextMenus.onClicked.addListener(function (info, tab){
//     console.log(JSON.stringify(info));
//     if (info.menuItemId === "deniedPage") {}
// });

chrome.storage.sync.get(null,function (items) {
    //console.log(JSON.stringify(items));
    if (items.showTips === undefined ) {
        //console.log("storage 是空的");
        chrome.storage.sync.set(settings);
    } else {
        //console.log("[ChaZD][Current Settings]");
        for (var key in items) {
            if (settings[key] === undefined) {
                chrome.storage.sync.remove(key);
                //console.log("Remove setting item '%s'", key);
            } else {
                settings[key] = items[key];
            }
        }
        chrome.storage.sync.set(settings);
    }
});

chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
        // console.log("message from sender:" + JSON.stringify(message));
        // alert("sender is " + JSON.stringify(sendResponssendResponsee));
        new ChaZD(preprocessWord(message.queryWord), message.useHttps, message.source, sendResponse);

        return true;
});


/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hexmd5(s){ return binl2hex(coremd5(str2binl(s), s.length * chrsz));}
function b64md5(s){ return binl2b64(coremd5(str2binl(s), s.length * chrsz));}
function strmd5(s){ return binl2str(coremd5(str2binl(s), s.length * chrsz));}
function hexhmacmd5(key, data) { return binl2hex(corehmacmd5(key, data)); }
function b64hmacmd5(key, data) { return binl2b64(corehmacmd5(key, data)); }
function strhmacmd5(key, data) { return binl2str(corehmacmd5(key, data)); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5vmtest()
{
  return hexmd5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function coremd5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safeadd(a, olda);
    b = safeadd(b, oldb);
    c = safeadd(c, oldc);
    d = safeadd(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5cmn(q, a, b, x, s, t)
{
  return safeadd(bitrol(safeadd(safeadd(a, q), safeadd(x, t)), s),b);
}
function md5ff(a, b, c, d, x, s, t)
{
  return md5cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5gg(a, b, c, d, x, s, t)
{
  return md5cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5hh(a, b, c, d, x, s, t)
{
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5ii(a, b, c, d, x, s, t)
{
  return md5cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Calculate the HMAC-MD5, of a key and some data
 */
function corehmacmd5(key, data)
{
  var bkey = str2binl(key);
  if(bkey.length > 16) {bkey = coremd5(bkey, key.length * chrsz);}

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = coremd5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
  return coremd5(opad.concat(hash), 512 + 128);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safeadd(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bitrol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert a string to an array of little-endian words
 * If chrsz is ASCII, characters >255 have their hi-byte silently ignored.
 */
function str2binl(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz){
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
  }
  return bin;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz){
    str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
  }
  return str;
}

/*
 * Convert an array of little-endian words to a hex string.
 */
function binl2hex(binarray)
{
  var hextab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hextab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) +
           hextab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of little-endian words to a base-64 string
 */
function binl2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * ( i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * ((i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * ((i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
        if(i * 8 + j * 6 > binarray.length * 32){
            str += b64pad;
        }else {
            str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
        }
    }
  }
  return str;
}
