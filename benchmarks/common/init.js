require(__dirname + "/../../node_modules/betajs-scoped/dist/scoped.js");
var BetaJS = require(__dirname + "/../../node_modules/betajs/dist/beta-noscoped.js");
require(__dirname + "/../../dist/betajs-data-noscoped.js");
Scoped.nextScope().binding("module", "global:DataOld", {
	readonly : true
});
var DataOld = require(__dirname + "/../../vendors/old-betajs-data-noscoped.js");
