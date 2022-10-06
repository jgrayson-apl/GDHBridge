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
   * @param layer
   * @returns {*}
   * @private
   */
  _esriLayerToLeafletLayer(layer) {
    return new Promise((resolve, reject) => {

      let leafletLayer;
      switch (layer.layerType) {
        case 'ArcGISTiledMapServiceLayer':
          leafletLayer = new L.esri.tiledMapLayer({url: layer.url, token: this.#token});
          break;
        case 'ArcGISMapServiceLayer':
          leafletLayer = new L.esri.dynamicMapLayer({url: layer.url, token: this.#token});
          break;
        case 'VectorTileLayer':
          leafletLayer = new L.esri.Vector.vectorTileLayer(layer.url || layer.styleUrl, {token: this.#token});
          break;
        case 'ArcGISImageServiceLayer':
          leafletLayer = new L.esri.imageMapLayer({url: layer.url, token: this.#token});
          break;
        case  "ArcGISTiledImageServiceLayer":
          console.warn("Unsupported Layer Type: ", layer);
          break;
        case 'ArcGISFeatureLayer':
          leafletLayer = new L.esri.featureLayer({url: layer.url, token: this.#token});
          break;
        default:
          if (layer.itemId) {
            this.#portalUtils.getItem({itemId: layer.itemId}).then(({item}) => {
              this._esriLayerToLeafletLayer(item).then(resolve);
            });
          } else {
            console.warn("Unsupported Layer Type: ", layer);
          }
      }

      resolve(leafletLayer);
    });
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

    this.#portalUtils.getItem({itemId, fetchData: true}).then(({item, data}) => {
      console.info(item, data);
      this.displayItemDetails(data, true);

      data.basemap?.baseMapLayers?.forEach(layer => {
        this._esriLayerToLeafletLayer(layer).then((leafletLayer) => {
          leafletLayer && leafletLayer.addTo(this.#map);
        });
      });

      data.operationalLayers?.forEach(layer => {
        this._esriLayerToLeafletLayer(layer).then((leafletLayer) => {
          leafletLayer && leafletLayer.addTo(this.#map);
        });
      });

    });

  };

}

export default new GeodesignHubBridge();
