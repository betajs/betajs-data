require(__dirname + "/../../vendors/scoped.js");
var BetaJS = require(__dirname + "/../../vendors/beta-noscoped.js");
require(__dirname + "/../../dist/betajs-data-noscoped.js");
Scoped.nextScope().binding("module", "global:DataOld", {
	readonly : true
});
var DataOld = require(__dirname + "/../../vendors/old-betajs-data-noscoped.js");
