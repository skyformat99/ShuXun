/**
 * Created by wuhaolin on 5/20/15.
 * 豆瓣图书列表
 */
"use strict";

APP.controller('book_bookList', function ($scope, $stateParams, BookRecommend$, BookInfo$) {
    $scope.title = $stateParams['title'];
    var cmd = $stateParams['cmd'];
    if (cmd == 'tag') {
        var tag = $stateParams['tag'];
        var me = AV.User.current();
        if (!tag && me) {
            tag = me.get('major');
        }
        BookRecommend$.TagBook.setTag(tag);
        BookRecommend$.TagBook.loadMore();
        $scope.title = tag;
        $scope.books = BookRecommend$.TagBook.books;
        $scope.loadMore = BookRecommend$.TagBook.loadMore;
        $scope.hasMore = BookRecommend$.TagBook.hasMore;
    } else if (cmd == 'latest') {
        $scope.books = BookInfo$.LatestBook.books;
        $scope.loadMore = BookInfo$.LatestBook.loadMore;
        $scope.title = '新书速递';
        $scope.hasMore = BookInfo$.LatestBook.hasMore;
    }
});