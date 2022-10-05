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
 *
 * https://apl.maps.arcgis.com/home/group.html?id=24c1915cc377457ba6e090c7c8685b3c
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

    // ONLINE CONTENT //
    const onlineContentItems = document.getElementById('online-content-items');
    const groupIdInput = document.getElementById('group-id-input');

    const onlineContentBtn = document.getElementById('online-content-btn');
    onlineContentBtn.addEventListener('click', () => {
      const groupId = groupIdInput.value;

      this.#portalUtils.getGroupContent({groupId}).then((groupContent) => {

        const itemNodes = groupContent.items.map(onlineItem => {
          const itemNode = document.createElement('div');
          itemNode.classList.add('online-item');
          itemNode.innerHTML = `[ ${ onlineItem.type } ]<br>${ onlineItem.title }`;
          itemNode.addEventListener('click', () => {

            // DISPLAY ITEM DETAILS //
            this.displayItemDetails(onlineItem);

            // LOAD WEB MAP //
            if (onlineItem.type === 'Web Map') {
              this.loadWebMap({itemId: onlineItem.id, token: this.#token});
            }
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

    itemTitle.innerHTML = onlineItem.title;

    if (append) {
      itemDetails.innerHTML += JSON.stringify(onlineItem, null, 2);
    } else {
      itemDetails.innerHTML = JSON.stringify(onlineItem, null, 2);
    }

  }

  /**
   *
   * @param layer
   * @returns {*}
   * @private
   */
  _esriLayerToLeafletLayer(layer) {
    //console.info(layer);

    let leafletLayer;

    switch (layer.layerType) {
      case 'ArcGISTiledMapServiceLayer':
        leafletLayer = L.esri.tiledMapLayer({url: layer.url, token: this.#token});
        break;
      case 'ArcGISMapServiceLayer':
        leafletLayer = L.esri.dynamicMapLayer({url: layer.url, token: this.#token});
        break;
      case 'VectorTileLayer':
        leafletLayer = L.esri.Vector.vectorTileLayer(layer.url, {token: this.#token});
        break;
      case 'ArcGISImageServiceLayer':
        leafletLayer = L.esri.imageMapLayer({url: layer.url, token: this.#token});
        break;
      case 'ArcGISFeatureLayer':
        leafletLayer = L.esri.featureLayer({url: layer.url, token: this.#token});
        break;
      default:
        console.warn("Unsupported Layer Type: ", layer);
    }

    return leafletLayer;
  }

  /**
   *
   * https://github.com/ynunokawa/L.esri.WebMap/issues/76
   *
   * @param {string} itemId
   * @param {string} [token]
   */
  loadWebMap = ({itemId, token}) => {

    this.#map?.remove();
    this.#map = L.map("map");

    /*this.#portalUtils.getWebMap({itemId}).then(({item, data}) => {
     console.info(item, data);

     data.basemap?.baseMapLayers?.forEach(layer => {
     const leafletLayer = this._esriLayerToLeafletLayer(layer);
     console.info(layer, leafletLayer);

     leafletLayer?.addTo(this.#map);
     });

     data.operationalLayers?.forEach(layer => {
     const leafletLayer = this._esriLayerToLeafletLayer(layer);
     console.info(layer, leafletLayer);

     leafletLayer?.addTo(this.#map);
     });

     });*/

    const webmap = L.esri.webMap(itemId, {map: this.#map, token: token});
    webmap?.on("load", () => {
      console.info(webmap);

      const overlayMaps = webmap.layers.reduce((infos, layerInfo) => {
        console.info(layerInfo);

        layerInfo.token = this.#token;
        layerInfo.layer.token = this.#token;

        infos[layerInfo.title] = layerInfo.layer;
        return infos;
      }, {});

      L.control.layers({}, overlayMaps, {position: "bottomleft"}).addTo(webmap._map);

    });

  };

}

export default new GeodesignHubBridge();
