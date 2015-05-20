/**
 * Created by wuhaolin on 5/20/15.
 *
 */
"use strict";

APP.controller('book_bookReview', function ($scope, $stateParams, DoubanBook$) {
    $scope.BookReview = DoubanBook$.BookReview;
    $scope.BookReview.nowBookId = $stateParams['doubanBookId'];
    $scope.title = $stateParams['bookTitle'] + ' 书评';
    $scope.$on('$ionicView.afterLeave', function () {
        $scope.BookReview.clear();
    });
});