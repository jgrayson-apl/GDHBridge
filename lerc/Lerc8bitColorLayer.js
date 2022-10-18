//
// INSPIRED HEAVILY BY https://github.com/jgravois/lerc-leaflet
//
// https://github.com/jwasilgeo/leaflet-experiments/blob/master/lerc-landcover/script.js
//

// create a custom layer type extending from the LeafletJS GridLayer
export const Lerc8bitColorLayer = L.GridLayer.extend({

  createTile: function (coords, done) {
    let tileError;
    let tile = L.DomUtil.create("canvas", "leaflet-tile");
    tile.width = this.options.tileSize;
    tile.height = this.options.tileSize;

    //console.info(`6/63/97 ::: ${ coords.z }/${ coords.y }/${ coords.x }`);

    let tileUrl = `${ this.options.url }/tile/${ coords.z }/${ coords.y }/${ coords.x }`;
    this.options.token && (tileUrl += `?token=${ this.options.token }`);

    fetch(tileUrl, {method: "GET"}).then((response) => {
      if (response.ok) {
        return response.arrayBuffer();
      } else { throw new Error(`no tile: ${ response.status }`); }
    }).then((arrayBuffer) => {
      try {

        // decode the response's arrayBuffer (Lerc global comes from an imported script)
        tile.decodedPixels = Lerc.decode(arrayBuffer);
        tile.decodedPixels.coords = coords;

        try {
          // display newly decoded pixel data as canvas context image data
          this.draw.call(this, tile);
        } catch (error) {
          //console.error(error);
          // displaying error text in the canvas tile is for debugging/demo purposes
          // we could instead call `this.draw.call(this, tile);` to bring less visual attention to any errors
          this.drawError(tile, "error drawing data");
        }

      } catch (error) {
        //console.error(error);
        // displaying error text in the canvas tile is for debugging/demo purposes
        // we could instead call `this.draw.call(this, tile);` to bring less visual attention to any errors
        this.drawError(tile, "error decoding data");
      }
      done(tileError, tile);
    }).catch((error) => {
      //console.error(error);
      // displaying error text in the canvas tile is for debugging/demo purposes
      // we could instead call `this.draw.call(this, tile);` to bring less visual attention to any errors
      this.drawError(tile, error?.message || "no arraybuffer");
      done(tileError, tile);
    });

    return tile;
  },

  draw: function (tile) {
    const width = tile.decodedPixels.width;
    const height = tile.decodedPixels.height;
    const pixels = tile.decodedPixels.pixels[0]; // get pixels from the first band (only 1 band when 8bit RGB)
    const mask = tile.decodedPixels.maskData;
    const rasterClassAttributes = this.options.rasterClassAttributes;
    const opacity = (this.options.opacity || 1.0);

    const {x, y, z} = tile.decodedPixels.coords;
    console.info(`${ z }/${ y }/${ x }`, tile.style.transform);

    // write new canvas context image data by working with the decoded pixel array and mask array
    const ctx = tile.getContext("2d"); // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < width * height; i++) {
      // look up RGB colormap attributes in the raster attribute table for the decoded pixel value
      const pixelValue = pixels[i];
      // class attributes //
      const attributes = rasterClassAttributes.find(attributes => attributes.Value === pixelValue);
      const hasClassName = (attributes?.ClassName !== "No Data");
      const missingData = (mask && !mask[i]);

      data[i * 4] = attributes?.Red || 0;
      data[i * 4 + 1] = attributes?.Green || 0;
      data[i * 4 + 2] = attributes?.Blue || 0;

      if (missingData || !hasClassName) {
        // make the pixel transparent when either missing data exists for the decoded mask value
        // or for this particular ImageServer when the ClassName raster attribute is "No Data"
        // set RGB values in the pixel array
        data[i * 4 + 3] = 0;
      } else {
        data[i * 4 + 3] = (255 * opacity);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  },

  drawError: function (tile, errorMsg = "error") {
    const width = tile.width;
    const height = tile.height;
    const ctx = tile.getContext("2d");
    ctx.font = "italic 12px sans-serif";
    ctx.fillStyle = "darkred";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(errorMsg, width / 2, height / 2, width - 10);
  }

});

/**
 *
 * @param options
 * @returns {Promise<Lerc8bitColorLayer>}
 */
export function lerc8bitColorLayer(options) {
  return new Promise((resolve, reject) => {
    if (options.url) {

      let rasterAttributeTableURL = `${ options.url }/rasterattributetable?f=json`;
      options.token && (rasterAttributeTableURL += `&token=${ options.token }`);

      fetch(rasterAttributeTableURL, {method: "GET"})
      .then((response) => response.json())
      .then((rasterAttributeTable) => {

        const rasterClassAttributes = rasterAttributeTable.features.filter(feature => feature?.attributes != null).map(feature => feature.attributes);
        const lercLayer = new Lerc8bitColorLayer({...options, rasterClassAttributes: rasterClassAttributes});

        resolve(lercLayer);
      }).catch(reject);
    } else {
      reject(new Error("Options missing 'url' parameter..."));
    }
  });
}

export default lerc8bitColorLayer;
