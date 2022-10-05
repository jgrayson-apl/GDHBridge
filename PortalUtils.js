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
 * PortalUtils
 *  - A few simple Portal related utilities
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  10/5/2022 - 0.0.1 -
 * Modified:
 *
 * https://developers.arcgis.com/esri-leaflet/
 * https://developers.arcgis.com/esri-leaflet/authentication/oauth2/
 * https://developers.arcgis.com/arcgis-rest-js/authentication/tutorials/authenticate-with-an-arcgis-identity-rest-js-browser/
 *
 * https://developers.arcgis.com/rest/users-groups-and-items/working-with-users-groups-and-items.htm
 *
 */

class PortalUtils extends EventTarget {

  static version = '0.0.1';

  /**
   *
   * @type {string}
   */
  static OPEN_WINDOWS_PARAMS = "height=400,width=600,menubar=no,location=yes,resizable=yes,scrollbars=yes,status=yes";

  /**
   *
   * @type {string}
   */
  static DEFAULT_PORTAL_URL = "https://www.arcgis.com/";

  /**
   *
   * @type {string}
   */
  portalURL;

  /**
   *
   * @type {string}
   */
  sharingURL;

  /**
   *
   * @type {string}
   */
  callbackPage;

  /**
   *
   * @type {string}
   * @private
   */
  #token;

  /**
   *
   * @param {string} [portalURL]
   */
  constructor({portalURL}) {
    super();

    this.callbackPage = window.location.href.replace(/index/, 'oauth-callback');

    this.portalURL = portalURL || PortalUtils.DEFAULT_PORTAL_URL;
    this.sharingURL = `${ this.portalURL }/sharing`;

  }

  /**
   *
   * @param {string} url
   * @returns {Promise<{}>}
   * @private
   */
  _getDetails(url) {
    return new Promise((resolve, reject) => {
      L.esri.get(url, {token: this.#token}, (error, response) => {
        (error != null) ? reject(error) : resolve(response);
      });
    });
  }

  /**
   *
   * @param clientId
   */
  authenticate({clientId}) {
    return new Promise((resolve, reject) => {

      window.oauthCallback = (token) => {
        // SET SESSION TOKEN //
        this.#token = token;

        // GET DETAILS ABOUT CURRENTLY SIGNED IN USER //
        this._getDetails(`${ this.sharingURL }/rest/portals/self`).then((response) => {
          resolve({user: response.user, token: this.#token});
        }).catch(reject);
      };

      const callbackURL = `https://www.arcgis.com/sharing/oauth2/authorize?client_id=${ clientId }&response_type=token&expiration=20160&redirect_uri=${ this.callbackPage }`;
      window.open(callbackURL, "oauth", PortalUtils.OPEN_WINDOWS_PARAMS);

    });
  }

  /**
   *
   * https://developers.arcgis.com/rest/users-groups-and-items/group-content.htm
   *
   * @param groupId
   */
  getGroupContent({groupId}) {
    return new Promise((resolve, reject) => {
      // GROUP DETAILS //
      this._getDetails(`${ this.sharingURL }/rest/content/groups/${ groupId }`).then((response) => {
        resolve(response);
      }).catch(reject);
    });
  }

  /**
   *
   * @param itemId
   * @returns {Promise<unknown>}
   */
  getItem({itemId}) {
    return new Promise((resolve, reject) => {
      this._getDetails(`${ this.sharingURL }/rest/content/items/${ itemId }`).then((itemResponse) => {
        this._getDetails(`${ this.sharingURL }/rest/content/items/${ itemId }/data`).then((dataResponse) => {
          resolve({item: itemResponse, data: dataResponse});
        }).catch(reject);
      }).catch(reject);
    });
  }

}

export default PortalUtils;
