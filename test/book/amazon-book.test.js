/**
 * Created by wuhaolin on 5/29/15.
 */
var assert = require('assert');
var _ = require('underscore');
var Util = require('./../util.js');
var AmazonBook = require('../../server/book/amazon-book.js');

describe('book/amazon-book.js', function () {

    describe.only('#spiderBookByISBN', function () {
        _.each(Util.ISBN_Legal_HasPub, function (isbn13) {
            it(isbn13 + '的信息是有的', function (done) {
                AmazonBook.spiderBookByISBN(isbn13).done(function (jsonBookInfo) {
                    assert(jsonBookInfo.isbn13 == isbn13, 'isbn13必须相等');
                    Util.checkJsonBookInfoIsNice(jsonBookInfo);
                    done();
                }).fail(function (err) {
                    done(err);
                })
            })
        });
    })
});