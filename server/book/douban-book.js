/**
 * Created by wuhaolin on 5/4/15.
 *
 */
"use strict";
var _ = require('underscore');
var AV = require('leanengine');
var Model = require('../../web/js/model.js');
var url = require('url');
var Unirest = require('unirest');
var Cheerio = require('cheerio');
var BookInfo = require('./book-info.js');
var DoubanAPIKey = '03cddf77fa33367f0b699e67ee99a37d';

exports.spiderAndSaveLatestBooks = function () {
    /**
     * 抓取豆瓣首页上的所有新书,返回一个数组,里面是图书的豆瓣Id
     * @returns {AV.Promise}
     */
    function spiderLatestBooksId() {
        var rePromise = new AV.Promise(null);
        Unirest.get('http://book.douban.com/latest')
            .end(function (res) {
                if (res.ok) {
                    var re = [];
                    var $ = Cheerio.load(res.raw_body);
                    $('a[href^="http://book.douban.com/subject/"]').each(function () {
                        var url = $(this).attr('href');
                        var id = url.split('/')[4];
                        re.push(id);
                    });
                    rePromise.resolve(re);
                } else {
                    rePromise.reject(res.error);
                }
            });
        return rePromise;
    }

    /**
     * 根据bookId调用豆瓣API获取图书信息,并且保存到AVOS LatestBook表
     * @param doubanBookId
     * @param delay 延迟多少毫秒,因为豆瓣有api调用频率限制,没有这个参数时为0
     * @returns {AV.Promise}
     */
    function saveOneLatestBookById(doubanBookId, delay) {
        delay = delay ? delay : 0;
        var rePromise = new AV.Promise(null);
        var query = new AV.Query(Model.BookInfo);
        query.equalTo('doubanId', doubanBookId);
        query.count().done(function (number) {
                if (number == 0) {//还没有这本书
                    setTimeout(function () {
                        exports.spiderBookByDoubanId(doubanBookId).done(function (jsonBook) {
                            BookInfo.queryBookInfoByISBN(jsonBook.isbn13).done(function (bookInfo) {
                                if (bookInfo) {
                                    _.each(jsonBook, function (key) {
                                        bookInfo.set(key, jsonBook[key]);
                                    })
                                } else {
                                    bookInfo = new Model.BookInfo.new(jsonBook);
                                }
                                bookInfo.save().done(function () {
                                    rePromise.resolve(bookInfo);
                                }).fail(function (err) {
                                    rePromise.reject(err);
                                })
                            }).fail(function (err) {
                                rePromise.reject(err);
                            });
                        }).fail(function (err) {
                            rePromise.reject(err);
                        });
                    }, delay);
                } else {//这本书已经存在
                    rePromise.resolve('这本书已经存在');
                }
            }
        ).fail(function (err) {
                rePromise.reject(err);
            });
        return rePromise;
    }

    var rePromise = new AV.Promise(null);
    spiderLatestBooksId().done(function (bookIds) {
        rePromise.resolve(bookIds.length);
        for (var i = 0; i < bookIds.length; i++) {
            saveOneLatestBookById(bookIds[i], i * 1000).fail(function (err) {
                console.error(err);
            })
        }
    }).fail(function (err) {
        rePromise.reject(err);
    });
    return rePromise;
};

/**
 * 去豆瓣抓取书评,
 * 每次返回25个
 * @param doubanBookId 豆瓣的图书id
 * @param start 开始
 * @returns {AV.Promise} json格式的{
                            reviewId: reviewId,
                            avatarUrl: avatarUrl,
                            title: title,
                            context: context
                        }
 */
exports.spiderDoubanBookReview = function (doubanBookId, start) {
    var rePromise = new AV.Promise(null);
    Unirest.get('http://book.douban.com/subject/' + doubanBookId + '/reviews')
        .query({
            start: start
        }).end(function (res) {
            if (res.ok) {
                var re = [];
                var $ = Cheerio.load(res.raw_body);
                $('.ctsh').each(function () {
                    var avatarUrl = $(this).find('img').first().attr('src');
                    var a = $(this).find('h3').first().children('a').first();
                    var reviewId = $(a).attr('href').split('/')[4];
                    var title = $(a).text();
                    var context = $(this).find('.review-short').first().children('span').first().text();
                    re.push({
                        reviewId: reviewId,
                        avatarUrl: avatarUrl,
                        title: title,
                        context: context
                    })
                });
                rePromise.resolve(re);
            } else {
                rePromise.reject(res.error);
            }
        });
    return rePromise;
};

/**
 * 简化豆瓣直接返回的json
 * 1.把id属性改名为doubanId
 * 2.把tags属性里的每一条属性{"count":8039,"name":"余华","title":"余华"} 中的title属性删除掉
 * @param doubanJson
 */
function simplifyDoubanBookJson(doubanJson) {
    doubanJson.doubanId = doubanJson.id;
    delete doubanJson.id;
    if (doubanJson.tags) {
        _.each(doubanJson.tags, function (one) {
            delete one.title;
        })
    }
    return doubanJson;
}

/**
 * 获得对应isbn的图书的所有字段的信息
 * @param isbn
 * @returns {AV.Promise} 返回兼容BookInfo表的json格式图书信息
 */
exports.spiderBookByISBN = function (isbn) {
    var rePromise = new AV.Promise(null);
    Unirest.get('https://api.douban.com/v2/book/isbn/' + isbn)
        .query({
            fields: BookInfo.BookInfoAttrName_douban.toString(),
            client_id: DoubanAPIKey
        })
        .end(function (res) {
            if (res.ok) {
                rePromise.resolve(simplifyDoubanBookJson(res.body));
            } else {
                rePromise.reject(res.error);
            }
        });
    return rePromise;
};

/**
 * 获得对应doubanId的图书的所有字段的信息
 * @param doubanId 图书的豆瓣id
 * @returns {AV.Promise|t.Promise} 返回兼容BookInfo表的json格式图书信息
 */
exports.spiderBookByDoubanId = function (doubanId) {
    var rePromise = new AV.Promise(null);
    Unirest.get('https://api.douban.com/v2/book/' + doubanId).query({
        fields: BookInfo.BookInfoAttrName_douban.toString(),
        client_id: DoubanAPIKey
    }).end(function (res) {
        if (res.ok) {
            rePromise.resolve(simplifyDoubanBookJson(res.body));
        } else {
            rePromise.reject(res.error);
        }
    });
    return rePromise;
};

/**
 * @param isbn13 isbn13
 * @return {AV.Promise}
 * 返回json格式 [{url,name,price,logoUrl}]
 */
exports.spiderBusinessInfo = function (isbn13) {
    var rePromise = new AV.Promise(null);
    exports.spiderDoubanIdByISBN13(isbn13).done(function (doubanId) {
        Unirest.get('http://frodo.douban.com/h5/book/' + doubanId + '/buylinks').end(function (res) {
            if (res.ok) {
                var $ = Cheerio.load(res.raw_body);
                var re = [];
                $("ck-part[type='item']").each(function () {
                    var one = {};
                    var first = $(this).children().first();
                    one.url = $(first).attr('href');
                    one.url = url.parse(one.url, true).query['url'];
                    one.name = $(first).text().trim().replace(/网|商城/, '');
                    one.price = parseFloat($(first).next().text().trim());
                    one.logoUrl = computeLogoUrlFromName(one.name);
                    re.push(one);
                });
                rePromise.resolve(re);
            } else {
                rePromise.reject(res.error);
            }
        });
    }).fail(function (err) {
        rePromise.reject(err);
    });
    return rePromise;

    /**
     * 更具网购网站名称计算出该网站的logo的URL
     * @param name 网站的名称
     * @returns {string} logo的URL
     */
    function computeLogoUrlFromName(name) {
        var re = 'pathLogo.png';
        if (name.indexOf('京东') >= 0) {
            re = 'logo-jd.png';
        } else if (name.indexOf('亚马逊') >= 0) {
            re = 'logo-amazon.png';
        } else if (name.indexOf('当当') >= 0) {
            re = 'logo-dangdang.png';
        } else if (name.indexOf('文轩') >= 0) {
            re = 'logo-wenxuan.png';
        } else if (name.indexOf('淘书') >= 0) {
            re = 'logo-taoshu.png';
        } else if (name.indexOf('中国图书') >= 0) {
            re = 'logo-bookschina.png';
        } else if (name.indexOf('China-pub') >= 0) {
            re = 'logo-chinapub.png';
        }
        return re;
    }
};

/**
 * 获得ISBN13对应图书的豆瓣ID
 * @param isbn13
 * @returns {AV.Promise|t.Promise} 返回doubanId
 */
exports.spiderDoubanIdByISBN13 = function (isbn13) {
    var rePromise = new AV.Promise(null);
    var query = new AV.Query(Model.BookInfo);
    query.equalTo('isbn13', isbn13);
    query.select('doubanId');
    query.first().done(function (avosBookInfo) {
        if (avosBookInfo) {
            rePromise.resolve(avosBookInfo.get('doubanId'));
        } else {
            rePromise.reject('找不到ISBN13对应的豆瓣ID');
        }
    });
    return rePromise;
};

/**
 * 调用豆瓣API搜索图书
 * @param keyword 查询关键字
 * @param tag 查询的tag
 * keywords和tag必传其一,不需要其中一个参数时传入null
 * @param start 取结果的offset 默认为0
 * @param count 取结果的条数 默认为20，最大为100
 * @param fields {Array} 选择需要的指定字段,如果为空就获取BookInfo表里的字段
 * @returns {AV.Promise|t.Promise} {
      "start": 0,
      "count": 10,
      "total": 30,
      "books" : [Book, ]
    }
 */
exports.searchBooks = function (keyword, tag, start, count, fields) {
    if (!fields) {
        fields = BookInfo.BookInfoAttrName_douban;
    }
    var rePromise = new AV.Promise(null);
    Unirest.get('https://api.douban.com/v2/book/search').query({
        q: keyword,
        tag: tag,
        start: start,
        count: count,
        fields: fields.toString(),
        client_id: DoubanAPIKey
    }).end(function (res) {
        if (res.ok) {
            rePromise.resolve(res.body);
        } else {
            rePromise.reject(res.error);
        }
    });
    return rePromise;
};