/*
 Copyright 2022 Esri

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
/**
 *
 * GeodesignHubBridge
 *  - Esri & Geodesign Hub Bridge
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  10/5/2022 - 0.0.1 -
 * Modified:
 *
 *
 * GeoPlanner Project - an ArcGIS.com Group
 * https://apl.maps.arcgis.com/home/group.html?id=24c1915cc377457ba6e090c7c8685b3c
 *
 * https://leafletjs.com/
 * https://developers.arcgis.com/esri-leaflet/
 *
 *
 * https://developers.arcgis.com/arcgis-rest-js/authentication/tutorials/authenticate-with-an-arcgis-identity-rest-js-browser/
 *
 * https://developers.arcgis.com/documentation/mapping-apis-and-services/content-management/services/portal-service/
 *
 */

import PortalUtils from './PortalUtils.js';

class GeodesignHubBridge extends EventTarget {

  static version = '0.0.1';

  /**
   *
   * @type {string}
   * @private
   */
  #clientId = "msDRPng92KMlf3RX";

  /**
   *
   * @type {PortalUtils}
   * @private
   */
  #portalUtils;

  /**
   *
   * @type {string}
   * @private
   */
  #token;

  /**
   *
   */
  #map;

  /**
   *
   */
  constructor() {
    super();

    // USER NAME //
    const usernameInput = document.getElementById('username-input');

    // PORTAL UTILS //
    this.#portalUtils = new PortalUtils({});
    this.#portalUtils.authenticate({clientId: this.#clientId}).then(({user, token}) => {
      // SESSION TOKEN //
      this.#token = token;
      // SIGNED IN USER //
      usernameInput.value = user.username;
    });

    // ITEM FILTER //
    //const mapTypes = ['Web Map'];
    const layerTypes = ['Feature Service', 'Image Service', 'Vector Tile Service']; //'Map Service',
    const invalidKeywords = ['Tiled Imagery'];
    const _layerFilter = (item) => (layerTypes.includes(item.type)) && item.typeKeywords.every(keyword => !invalidKeywords.includes(keyword));
    //const _itemFilter = (item) => (mapTypes.includes(item.type) || layerTypes.includes(item.type)) && item.typeKeywords.every(keyword => !invalidKeywords.includes(keyword));

    // ONLINE CONTENT //
    const onlineContentItems = document.getElementById('online-content-items');
    const groupIdSelect = document.getElementById('group-id-select');

    const onlineContentBtn = document.getElementById('online-content-btn');
    onlineContentBtn.addEventListener('click', () => {
      const groupId = groupIdSelect.value;

      this.#portalUtils.getGroupContent({groupId}).then((groupContent) => {

        const itemNodes = groupContent.items.filter(_layerFilter).map(onlineItem => {

          const itemNode = document.createElement('div');
          itemNode.classList.add('online-item');
          itemNode.innerHTML = `[ ${ onlineItem.type } ]<br>${ onlineItem.title }`;
          itemNode.title = onlineItem.typeKeywords.join(' | ');
          itemNode.addEventListener('click', (evt) => {
            evt.stopPropagation();

            // DISPLAY ITEM DETAILS //
            this.displayItemDetails(onlineItem);

            // DISPLAY LAYER //
            this.displayLayer({item: onlineItem, token: this.#token});

          });
          itemNode.addEventListener('dblclick', (evt) => {
            evt.stopPropagation();
            window.open(`https://www.arcgis.com/home/item.html?id=${ onlineItem.id }`);
          });

          return itemNode;
        });
        onlineContentItems.replaceChildren(...itemNodes);

      });
    });

  }

  /**
   *
   * @param onlineItem
   * @param append
   */
  displayItemDetails(onlineItem, append = false) {

    const itemTitle = document.getElementById('item-title');
    const itemDetails = document.getElementById('item-details');

    onlineItem.title && (itemTitle.innerHTML = onlineItem.title);

    if (append) {
      itemDetails.innerHTML += "<br><br>";
      itemDetails.innerHTML += JSON.stringify(onlineItem, null, 2);
    } else {
      itemDetails.innerHTML = JSON.stringify(onlineItem, null, 2);
    }

  }

  /**
   *
   * @param {{}} item
   * @param {{}} [data]
   * @returns {*}
   * @private
   */
  _esriLayerItemToLeafletLayer(item, data = {}) {
    return new Promise((resolve, reject) => {
      console.info(item.type, item);

      let leafletLayer;
      switch (item.type) {

        case 'ArcGISFeatureLayer':
        case 'Feature Service':
          item.url = item.url.endsWith('/FeatureServer') ? `${ item.url }/0` : item.url;
          leafletLayer = new L.esri.featureLayer({url: item.url, token: this.#token, ...data});
          break;

        case 'VectorTileLayer':
        case 'Vector Tile Service':
          leafletLayer = new L.esri.Vector.vectorTileLayer(item.id || item.url || item.styleUrl, {token: this.#token, ...data});
          break;

        case 'ArcGISImageServiceLayer':
        case 'Image Service':
          leafletLayer = new L.esri.imageMapLayer({url: item.url, token: this.#token, ...data});
          break;

        /*case 'ArcGISMapServiceLayer':
         leafletLayer = new L.esri.dynamicMapLayer({url: layerInfo.url, token: this.#token});
         break;*/

        /*case 'ArcGISTiledMapServiceLayer':
         leafletLayer = new L.esri.tiledMapLayer({url: layerInfo.url, token: this.#token});
         break;*/

        /*case 'ArcGISTiledImageServiceLayer':
         reject(new Error(`Unsupported Layer Type: ${ JSON.stringify(layerInfo) }`));
         break;*/

        default:
          reject(new Error(`Unsupported Layer Type: ${ JSON.stringify(item) }`));
      }

      resolve(leafletLayer);
    });
  }

  /**
   *
   * @param {{}} item
   * @param {string} [token]
   */
  displayLayer({item, token}) {

    this.#map?.remove();
    this.#map = L.map("map").setView([34.0, -117.0], 9);
    L.esri.basemapLayer('Topographic').addTo(this.#map);

    this.#portalUtils.getItemData({itemId: item.id}).then(({data}) => {

      const layerDefinition = data.layers[item.subInfo].layerDefinition;
      this.displayItemDetails(layerDefinition, true);

      const layerOptions = {};
      if(layerDefinition) {
        layerDefinition.definitionExpression && (layerOptions.where = layerDefinition.definitionExpression);
        layerDefinition.fields && (layerOptions.fields = ["OBJECTID"].concat(layerDefinition.fields.map(fld => fld.name)));
      }

      this._esriLayerItemToLeafletLayer(item, layerOptions).then((leafletLayer) => {
        leafletLayer && leafletLayer.addTo(this.#map);
      }).catch(this._displayError);

    }).catch(this._displayError);

  }

  /**
   *
   * @param {string} itemId
   * @param {string} [token]
   */
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

  /**
   *
   * @param error
   * @param [info]
   * @private
   */
  _displayError(error, info) {
    console.warn(error, info);
  }

}

export default new GeodesignHubBridge();
