
/*displayWebMap({itemId, token}) {

 this.#map?.remove();
 this.#map = L.map("map").setView([34.0, -117.0], 9);
 //L.esri.basemapLayer('Topographic').addTo(this.#map);

 this.#portalUtils.getItem({itemId, fetchData: true}).then(({item, data}) => {
 console.info(item, data);

 this.displayItemDetails(data, true);

 data.basemap?.baseMapLayers?.forEach(layer => {
 this._esriLayerToLeafletLayer(layer).then((leafletLayer) => {
 leafletLayer && leafletLayer.addTo(this.#map);
 }).catch(this._displayError);
 });

 data.operationalLayers?.forEach(layer => {
 this._esriLayerToLeafletLayer(layer).then((leafletLayer) => {
 leafletLayer && leafletLayer.addTo(this.#map);
 }).catch(this._displayError);
 });

 });

 }*/


/*case 'XXX':
 leafletLayer = new L.esri.dynamicMapLayer({url: layerInfo.url, token: this.#token});
 break;*/

/*case 'XXX':
 leafletLayer = new L.esri.tiledMapLayer({url: layerInfo.url, token: this.#token});
 break;*/

/*case 'XXX':
 reject(new Error(`Unsupported Layer Type: ${ JSON.stringify(layerInfo) }`));
 break;*/
