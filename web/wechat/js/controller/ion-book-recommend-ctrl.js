/**
 * Created by wuhaolin on 5/20/15.
 * 主页推荐
 */
"use strict";

APP.controller('ion_book_recommend', function ($scope, $controller, $state, $ionicModal, IonicModalView$) {
    $controller('book_recommendCtrl', {$scope: $scope});

    $ionicModal.fromTemplateUrl('template/bookTags.html', {
        scope: $scope
    }).then(function (modal) {
        $scope.bookTagsModalView = modal;
    });
    $scope.$on('$ionicView.afterEnter', $scope._setMajorFilterAndLoad);
    //去制定专业的推荐页面
    IonicModalView$.registerChooseMajorModalView($scope, function (major) {
        $state.go('tab.book_recommend', {major: major});
    });
});