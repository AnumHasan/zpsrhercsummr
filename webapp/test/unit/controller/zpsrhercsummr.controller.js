/*global QUnit*/

sap.ui.define([
	"zpsrhercsummr/controller/zpsrhercsummr.controller"
], function (Controller) {
	"use strict";

	QUnit.module("zpsrhercsummr Controller");

	QUnit.test("I should test the zpsrhercsummr controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
