// INSPIRED HEAVILY BY https://github.com/jgravois/lerc-leaflet
// https://github.com/jwasilgeo/leaflet-experiments/blob/master/lerc-landcover/script.js

// create a custom layer type extending from the LeafletJS GridLayer
export const Lerc8bitColorLayer = L.GridLayer.extend({

  createTile: function (coords, done) {
    let tileError;
    let tile = L.DomUtil.create("canvas", "leaflet-tile");
    tile.width = this.options.tileSize;
    tile.height = this.options.tileSize;

    let tileUrl = `${ this.options.url }/tile/${ coords.z }/${ coords.y }/${ coords.x }`;
    this.options.token && (tileUrl += `?token=${ this.options.token }`);

    fetch(tileUrl, {method: "GET"})
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => {
      try {
        // decode the response's arrayBuffer (Lerc global comes from an imported script)
        tile.decodedPixels = Lerc.decode(arrayBuffer);

        // display newly decoded pixel data as canvas context image data
        this.draw.call(this, tile);
      } catch (error) {
        //console.error(error);
        // displaying error text in the canvas tile is for debugging/demo purposes
        // we could instead call `this.draw.call(this, tile);` to bring less visual attention to any errors
        this.drawError(tile);
      }
      done(tileError, tile);
    })
    .catch((error) => {
      //console.error(error);
      // displaying error text in the canvas tile is for debugging/demo purposes
      // we could instead call `this.draw.call(this, tile);` to bring less visual attention to any errors
      this.drawError(tile);
      done(tileError, tile);
    });

    return tile;
  },

  draw: function (tile) {
    const width = tile.decodedPixels.width;
    const height = tile.decodedPixels.height;
    const pixels = tile.decodedPixels.pixels[0]; // get pixels from the first band (only 1 band when 8bit RGB)
    const mask = tile.decodedPixels.maskData;
    const rasterAttributeTableFeatures = this.options.rasterAttributeTable.features;
    const opacity = this.options.opacity || 1.0;

    // write new canvas context image data by working with the decoded pixel array and mask array
    const ctx = tile.getContext("2d"); // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    for (let i = 0; i < width * height; i++) {
      // look up RGB colormap attributes in the raster attribute table for the decoded pixel value
      const pixelValue = pixels[i];
      const attributes = rasterAttributeTableFeatures.find(info => info.attributes.Value === pixelValue).attributes;

      // set RGB values in the pixel array
      data[i * 4] = attributes.Red;
      data[i * 4 + 1] = attributes.Green;
      data[i * 4 + 2] = attributes.Blue;

      // make the pixel transparent when either missing data exists for the decoded mask value
      // or for this particular ImageServer when the ClassName raster attribute is "No Data"
      if ((mask && !mask[i]) || attributes.ClassName === "No Data") {
        data[i * 4 + 3] = 0;
      } else {
        data[i * 4 + 3] = (255 * opacity);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  },

  drawError: function (tile) {
    const width = tile.width;
    const height = tile.height;
    const ctx = tile.getContext("2d");
    ctx.font = "italic 12px sans-serif";
    ctx.fillStyle = "darkred";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "error decoding data", // or tile may not exist here
      width / 2,
      height / 2,
      width - 10
    );
  }

});

/**
 *
 * @param options
 * @returns {Promise<Lerc8bitColorLayer>}
 */
export function lerc8bitColorLayer(options) {
  return new Promise((resolve, reject) => {

    let rasterAttributeTableURL = `${ options.url }/rasterattributetable?f=json`;
    options.token && (rasterAttributeTableURL += `&token=${ options.token }`);

    fetch(rasterAttributeTableURL, {method: "GET"})
    .then((response) => response.json())
    .then((rasterAttributeTable) => {

      const lercLayer = new Lerc8bitColorLayer({...options, rasterAttributeTable: rasterAttributeTable});

      resolve(lercLayer);
    }).catch(reject);
  });
}

export default lerc8bitColorLayer;
