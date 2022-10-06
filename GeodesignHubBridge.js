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
    const mapTypes = ['Web Map'];
    const layerTypes = ['Feature Service', 'Image Service'];
    const invalidKeywords = ['Tiled Imagery'];
    const _itemFilter = (item) => (mapTypes.includes(item.type) || layerTypes.includes(item.type)) && item.typeKeywords.every(keyword => !invalidKeywords.includes(keyword));

    // ONLINE CONTENT //
    const onlineContentItems = document.getElementById('online-content-items');
    const groupIdInput = document.getElementById('group-id-input');

    const onlineContentBtn = document.getElementById('online-content-btn');
    onlineContentBtn.addEventListener('click', () => {
      const groupId = groupIdInput.value;

      this.#portalUtils.getGroupContent({groupId}).then((groupContent) => {

        const itemNodes = groupContent.items.filter(item => {
          const isValid = _itemFilter(item);
          !isValid && this._displayError(new Error(`Unsupported Layer Type: ${ JSON.stringify(item.title) }`), item);
          return isValid;
        }).map(onlineItem => {

          const itemNode = document.createElement('div');
          itemNode.classList.add('online-item');
          itemNode.innerHTML = `[ ${ onlineItem.type } ]<br>${ onlineItem.title }`;
          itemNode.title = onlineItem.typeKeywords.join(' | ');
          itemNode.addEventListener('click', () => {

            // DISPLAY ITEM DETAILS //
            this.displayItemDetails(onlineItem);

            // LOAD WEB MAP //
            if (onlineItem.type === 'Web Map') {
              this.displayWebMap({itemId: onlineItem.id, token: this.#token});
            } else {
              this.displayLayer({itemId: onlineItem.id, token: this.#token});
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
   * @param layerInfo
   * @returns {*}
   * @private
   */
  _esriLayerToLeafletLayer(layerInfo) {
    return new Promise((resolve, reject) => {

      if (layerInfo.itemId) {
        this.#portalUtils.getItem({itemId: layerInfo.itemId}).then(({item}) => {
          this._esriLayerToLeafletLayer(item).then(resolve).catch(reject);
        }).catch(reject);

      } else {

        console.info(layerInfo.layerType, layerInfo.type, layerInfo);

        let leafletLayer;
        switch (layerInfo.layerType || layerInfo.type) {

          case 'ArcGISFeatureLayer':
          case 'Feature Service':
            layerInfo.url = layerInfo.url.endsWith('/FeatureServer') ? `${ layerInfo.url }/0` : layerInfo.url;
            leafletLayer = new L.esri.featureLayer({url: layerInfo.url, token: this.#token});
            break;

          case 'ArcGISMapServiceLayer':
            leafletLayer = new L.esri.dynamicMapLayer({url: layerInfo.url, token: this.#token});
            break;

          case 'ArcGISTiledMapServiceLayer':
            leafletLayer = new L.esri.tiledMapLayer({url: layerInfo.url, token: this.#token});
            break;

          case 'VectorTileLayer':
            leafletLayer = new L.esri.Vector.vectorTileLayer(layerInfo.url || layerInfo.styleUrl, {token: this.#token});
            break;

          case 'ArcGISImageServiceLayer':
          case 'Image Service':
            leafletLayer = new L.esri.imageMapLayer({url: layerInfo.url, token: this.#token});
            break;

          case 'ArcGISTiledImageServiceLayer':
            reject(new Error(`Unsupported Layer Type: ${ JSON.stringify(layerInfo) }`));
            break;

          default:
            reject(new Error(`Unsupported Layer Type: ${ JSON.stringify(layerInfo) }`));
        }

        resolve(leafletLayer);
      }
    });
  }

  /**
   *
   * @param {string} itemId
   * @param {string} [token]
   */
  displayLayer({itemId, token}) {

    this.#map?.remove();
    this.#map = L.map("map").setView([34.0, -117.0], 9);
    L.esri.basemapLayer('Topographic').addTo(this.#map);

    this.#portalUtils.getItem({itemId}).then(({item}) => {
      console.info(item);

      this._esriLayerToLeafletLayer(item).then((leafletLayer) => {
        leafletLayer && leafletLayer.addTo(this.#map);
      }).catch(this._displayError);

    });

  }

  /**
   *
   * @param {string} itemId
   * @param {string} [token]
   */
  displayWebMap({itemId, token}) {

    this.#map?.remove();
    this.#map = L.map("map").setView([34.0, -117.0], 9);
    L.esri.basemapLayer('Topographic').addTo(this.#map);

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

  }

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
