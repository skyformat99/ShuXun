/**
 * Created by wuhaolin on 4/1/15.
 * 自定义全局函数和路由配置
 */
"use strict";

//应用当前版本号
var AppVersion = '2.0';
//AVOSCloud
AV.initialize("kusn9e3cp5znt5lic9fufqfmsvsibsoaejpah089x6v2n7e0", "nt5l8v4n4m08zxttpt7upqxwgt6oy47lzb3f8c4juf34otfm");
if (window.location.host.indexOf('ishuxun.cn') < 0) {//如果网址不是ishuxun.cn就调用部署环境的云函数
    AV.setProduction(false);
}

//微信公共平台
var WECHAT = {
    AppID_WeChat: 'wx2940a8d3ddcad5e9',
    AppID_Desktop: 'wxfd9e8438cef56f19'
};

var LoadCount = Math.floor(document.body.clientWidth / 80);//每次加载条数,默认加载慢屏幕
//根据我的IP地址获得的我的地理位置
var MyLocationByIP = null;
AV.Cloud.run('getMyLocationByIP').done(function (location) {
    MyLocationByIP = location;
});

/**
 * 把一个数组push到一个数组后面,会直接改变原数组
 * 对于AV.Object数组不会把相同的元素加入进去
 * @param array
 */
Array.prototype.pushUniqueArray = function (array) {
    var that = this;
    AV._.each(array, function (newOne) {
        if (newOne instanceof AV.Object) {
            if (AV._.find(that, function (existOne) {
                    return existOne.id == newOne.id;
                }) === undefined) {
                that.push(newOne);
            }
        } else {
            that.push(newOne);
        }
    });
};
/**
 * 把一个数组unshift到一个数组后面,会直接改变原数组
 * 对于AV.Object数组不会把相同的元素加入进去
 * @param array
 */
Array.prototype.unshiftUniqueArray = function (array) {
    var that = this;
    AV._.each(array, function (newOne) {
        if (newOne instanceof AV.Object) {
            if (AV._.find(that, function (existOne) {
                    return existOne.id == newOne.id;
                }) === undefined) {
                that.unshift(newOne);
            }
        } else {
            that.unshift(newOne);
        }
    });
};

/**
 * 自定义的jsonp调用
 * @param url 目标url
 * @returns {AV.Promise} json
 */
function jsonp(url) {
    var rePromise = new AV.Promise();
    var script = document.createElement('script');
    script.type = "text/javascript";
    var random = Date.now() + String(Math.floor(Math.random() * 100));
    script.src = url + (url.indexOf('?') > 0 ? '&' : '?') + 'callback=CB' + random;
    script.onload = function () {
        script.parentNode.removeChild(script);
    };
    script.onerror = function (error) {
        rePromise.reject(error);
    };
    window['CB' + random] = function (json) {
        rePromise.resolve(json);
    };
    document.head.appendChild(script);
    return rePromise;
}

function createCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + expires + "; path=/";
}
function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}
function eraseCookie(name) {
    createCookie(name, "", -1);
}