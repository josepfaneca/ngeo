webpackJsonp([36],{446:function(e,t,i){i(10),e.exports=i(447)},447:function(e,t,i){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),i(448),i(11);m(i(82));var o=m(i(16)),n=m(i(13)),a=m(i(18)),r=(m(i(40)),m(i(35))),s=m(i(27)),l=m(i(53)),d=m(i(28)),u=m(i(59)),p=m(i(26)),f=m(i(1)),c=m(i(17)),h=m(i(306));function m(e){return e&&e.__esModule?e:{default:e}}var g={};g.module=angular.module("app",[f.default.module.name,c.default.name,h.default.name]),g.MainController=function(e,t){var i=this;this.scope_=t;var f=new p.default;this.map=new n.default({layers:[new l.default({source:new u.default({url:"http://wms.geo.admin.ch/",crossOrigin:"anonymous",attributions:'&copy; <a href="http://www.geo.admin.ch/internet/geoportal/en/home.html">Pixelmap 1:500000 / geo.admin.ch</a>',params:{LAYERS:"ch.swisstopo.pixelkarte-farbe-pk1000.noscale",FORMAT:"image/jpeg"},serverType:"mapserver"})}),new d.default({source:f})],view:new a.default({projection:"EPSG:21781",extent:[42e4,3e4,9e5,35e4],zoom:0,center:[0,0]})});var c=this.map,h=new d.default({source:new p.default});this.snappedPoint_=new o.default,h.getSource().addFeature(this.snappedPoint_),h.setMap(c),this.profilePoisData=[{sort:1,dist:1e3,title:"First POI",id:12345},{sort:2,dist:3e3,title:"Second POI",id:12346}],this.profileData=void 0,e.get("data/profile.json").then(function(e){var t=e.data.profile;i.profileData=t;var n=void 0,a=t.length,s=new r.default([],"XYM");for(n=0;n<a;n++){var l=t[n];s.appendCoordinate([l.x,l.y,l.dist])}f.addFeature(new o.default(s));var d=i.map.getSize();c.getView().fit(f.getExtent(),{size:d})}),c.on("pointermove",function(e){if(!e.dragging){var t=c.getEventCoordinate(e.originalEvent);i.snapToGeometry(t,f.getFeatures()[0].getGeometry())}});var m=function(e,t,i){return function(e){return void 0!==i&&(e=e[i]),e[t]}},g=m(0,"dist"),v={line1:{style:{},zExtractor:m(0,"mnt","values")}},w={sort:m(0,"sort"),id:m(0,"id"),dist:m(0,"dist"),title:m(0,"title"),z:function(e,t){return void 0!==t&&(e.z=t),e.z}},y=function(e){this.point=e,this.snappedPoint_.setGeometry(new s.default([e.x,e.y]))}.bind(this),C=function(){this.point=null,this.snappedPoint_.setGeometry(null)}.bind(this);this.profileOptions={distanceExtractor:g,linesConfiguration:v,poiExtractor:w,hoverCallback:y,outCallback:C},this.point=null,this.profileHighlight=void 0},g.MainController.$inject=["$http","$scope"],g.MainController.prototype.snapToGeometry=function(e,t){var i=t.getClosestPoint(e),o=i[0]-e[0],n=i[1]-e[1],a=Math.sqrt(o*o+n*n)/this.map.getView().getResolution();this.profileHighlight=a<8?i[2]:-1,this.scope_.$apply()},g.module.controller("MainController",g.MainController),t.default=g},448:function(e,t){}},[446]);
//# sourceMappingURL=elevationProfile.e71942d5d1c1dd4d780e.js.map