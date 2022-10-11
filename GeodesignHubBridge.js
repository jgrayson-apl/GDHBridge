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
  #clientId = "PZdAgiu187TroTCX";

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
  #layerControl = null;

  /**
   *
   */
  constructor() {
    super();

    // SIGN IN //
    this._initializeSignIn();

  }

  /**
   *
   * @private
   */
  _initializeSignIn() {

    // PORTAL UTILS //
    this.#portalUtils = new PortalUtils({});

    // SIGN IN BUTTON //
    const signInBtn = document.getElementById('sign-in-btn');
    signInBtn.addEventListener('click', () => {

      // USER NAME INPUT //
      const usernameInput = document.getElementById('username-input');

      // AUTHENTICATE //
      this.#portalUtils.authenticate({clientId: this.#clientId}).then(({user, token}) => {
        // SESSION TOKEN //
        this.#token = token;
        // SIGNED IN USER //
        usernameInput.value = user.username;

        // INITIAL MAP //
        this._resetMap();

        // GROUP CONTENT //
        this._initializeGroupContent();

      });

    });

  }

  /**
   *
   * @private
   */
  _initializeGroupContent() {

    // LAYER ITEM FILTER //
    const layerTypes = ['Feature Service', 'Image Service', 'Vector Tile Service']; //'Map Service',
    const _layerFilter = (item) => {
      if (layerTypes.includes(item.type)) {
        if (item.typeKeywords.includes('Tiled Imagery')) {
          return !item.typeKeywords.includes('Hosted Service');
        } else { return true; }
      } else { return false; }
    };

    // ONLINE CONTENT CONTAINER //
    const onlineContentItems = document.getElementById('online-content-items');
    // GROUP ID SELECT //
    const groupIdSelect = document.getElementById('group-id-select');

    // GET ONLINE CONTENT //
    const onlineContentBtn = document.getElementById('online-content-btn');
    onlineContentBtn?.addEventListener('click', () => {

      this._resetMap();

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

    const onlineContentDetail = document.getElementById('online-content-details');
    onlineContentDetail?.toggleAttribute('hidden', false);

    const onlineItemDetails = document.getElementById('online-item-details');
    onlineItemDetails?.toggleAttribute('hidden', false);

  }

  /**
   *
   * https://leafletjs.com/reference.html#control-layers
   *
   * https://developers.arcgis.com/esri-leaflet/api-reference/layers/vector-basemap/
   *
   * https://developers.arcgis.com/documentation/mapping-apis-and-services/maps/services/basemap-layer-service/#custom-basemap-styles
   *
   * @private
   */
  _resetMap() {

    this.#map?.remove();
    this.#map = L.map("map").setView([34.0, -117.0], 12);
    this.#layerControl = L.control.layers().addTo(this.#map);

    // TOPO BASEMAP //
    const topoBasemap = L.layerGroup([
      L.esri.Vector.vectorBasemapLayer("ArcGIS:Topographic", {token: this.#token}),
      L.esri.Vector.vectorBasemapLayer("ArcGIS:Topographic:Base", {token: this.#token})
    ]).addTo(this.#map);

    this.#layerControl.addBaseLayer(topoBasemap, 'Topographic');

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

        case 'Feature Service':
          item.url = item.url.endsWith('/FeatureServer') ? `${ item.url }/0` : item.url;
          leafletLayer = L.esri.featureLayer({url: item.url, token: this.#token, ...data});
          break;

        case 'Vector Tile Service':
          leafletLayer = L.esri.Vector.vectorTileLayer(item.id || item.url || item.styleUrl, {token: this.#token, ...data});
          break;

        case 'Image Service':
          if (item.typeKeywords.includes('Tiled Imagery')) {
            leafletLayer = L.tileLayer(`${ item.url }/tile/{z}/{y}/{x}`, {token: this.#token, ...data});
          } else {
            leafletLayer = L.esri.imageMapLayer({url: item.url, token: this.#token, ...data});
          }
          break;

        default:
          reject(new Error(`Invalid type for this application: ${ JSON.stringify(item) }`));
      }

      resolve(leafletLayer);
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
   * @param {string} [token]
   */
  displayLayer({item, token}) {

    this._resetMap();

    // GET ITEM DATA //
    this.#portalUtils.getItemData({itemId: item.id}).then(({data}) => {
      // DISPLAY LAYER OVERRIDES //
      data && this.displayItemDetails(data, true);
      // GET ESRI-LEAFLET LAYER //
      this._esriLayerItemToLeafletLayer(item, {opacity: 0.8}).then((leafletLayer) => {
        // ADD ESRI-LEAFLET LAYER TO LEAFLET MAP //
        if (leafletLayer) {

          leafletLayer.addTo(this.#map);

          this.#layerControl.addOverlay(leafletLayer, item.title);

        }
      }).catch(this._displayError);
    }).catch(this._displayError);

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
