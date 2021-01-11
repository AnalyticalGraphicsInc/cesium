import MockImageryProvider from "../MockImageryProvider.js";
import MockTerrainProvider from "../MockTerrainProvider.js";
import TerrainTileProcessor from "../TerrainTileProcessor.js";
import {
  ArcGISTiledElevationTerrainProvider,
  Cartesian3,
  Cartesian4,
  createWorldTerrain,
  Ellipsoid,
  EllipsoidTerrainProvider,
  GeographicTilingScheme,
  GlobeSurfaceTile,
  ImageryLayerCollection,
  QuadtreeTile,
  QuadtreeTileLoadState,
  Ray,
  SceneMode,
  TerrainState,
  WebMercatorTilingScheme,
  when,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import arcGisTestData from "./GlobeSurfaceTileSpecData.js";
import { resetXHRPatch, setupXHRCache } from "../patchXHRLoad.js";
import CesiumMath from "../../Source/Core/Math.js";

describe("Scene/GlobeSurfaceTile", function () {
  var frameState;
  var tilingScheme;
  var rootTiles;
  var rootTile;
  var imageryLayerCollection;
  var mockTerrain;
  var processor;

  beforeEach(function () {
    frameState = {
      context: {
        cache: {},
      },
    };

    tilingScheme = new GeographicTilingScheme();
    rootTiles = QuadtreeTile.createLevelZeroTiles(tilingScheme);
    rootTile = rootTiles[0];
    imageryLayerCollection = new ImageryLayerCollection();

    mockTerrain = new MockTerrainProvider();

    processor = new TerrainTileProcessor(
      frameState,
      mockTerrain,
      imageryLayerCollection
    );
  });

  afterEach(function () {
    for (var i = 0; i < rootTiles.length; ++i) {
      rootTiles[i].freeResources();
    }
  });

  describe("processStateMachine", function () {
    beforeEach(function () {
      processor.mockWebGL();
    });

    it("starts in the START state", function () {
      for (var i = 0; i < rootTiles.length; ++i) {
        var tile = rootTiles[i];
        expect(tile.state).toBe(QuadtreeTileLoadState.START);
      }
    });

    it("transitions to the LOADING state immediately if this tile is available", function () {
      mockTerrain.willBeAvailable(rootTile.southwestChild);

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(rootTile.southwestChild.state).toBe(
          QuadtreeTileLoadState.LOADING
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.UNLOADED
        );
      });
    });

    it("transitions to the LOADING tile state and FAILED terrain state immediately if this tile is NOT available", function () {
      mockTerrain.willBeUnavailable(rootTile.southwestChild);

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(rootTile.southwestChild.state).toBe(
          QuadtreeTileLoadState.LOADING
        );
        expect(rootTile.southwestChild.data.terrainState).toBe(
          TerrainState.FAILED
        );
      });
    });

    it("pushes parent along if waiting on it to be able to upsample", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild);

      spyOn(mockTerrain, "requestTileGeometry").and.callThrough();

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(0);
      });
    });

    it("does nothing when a root tile is unavailable", function () {
      mockTerrain.willBeUnavailable(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
        expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
      });
    });

    it("does nothing when a root tile fails to load", function () {
      mockTerrain.requestTileGeometryWillFail(rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.state).toBe(QuadtreeTileLoadState.FAILED);
        expect(rootTile.data.terrainState).toBe(TerrainState.FAILED);
      });
    });

    it("upsamples failed tiles from parent TerrainData", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.data.terrainData.wasCreatedByUpsampling()).toBe(
            false
          );
          expect(
            rootTile.southwestChild.data.terrainData.wasCreatedByUpsampling()
          ).toBe(true);
        });
    });

    it("loads available tiles", function () {
      mockTerrain
        .willBeAvailable(rootTile.southwestChild)
        .requestTileGeometryWillSucceed(rootTile.southwestChild);

      spyOn(mockTerrain, "requestTileGeometry").and.callThrough();

      return processor.process([rootTile.southwestChild]).then(function () {
        expect(mockTerrain.requestTileGeometry.calls.count()).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[0]).toBe(0);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[1]).toBe(1);
        expect(mockTerrain.requestTileGeometry.calls.argsFor(0)[2]).toBe(1);
      });
    });

    it("marks an upsampled tile as such", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillFail(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(true);
        });
    });

    it("does not mark a tile as upsampled if it has fresh imagery", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeUnavailable(rootTile.southwestChild)
        .upsampleWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
        });
    });

    it("does not mark a tile as upsampled if it has fresh terrain", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .willBeAvailable(rootTile.southwestChild)
        .requestTileGeometryWillSucceed(rootTile.southwestChild)
        .createMeshWillSucceed(rootTile.southwestChild);

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery
        .requestImageWillSucceed(rootTile)
        .requestImageWillFail(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.state).toBe(QuadtreeTileLoadState.DONE);
          expect(rootTile.upsampledFromParent).toBe(false);
          expect(rootTile.southwestChild.state).toBe(
            QuadtreeTileLoadState.DONE
          );
          expect(rootTile.southwestChild.upsampledFromParent).toBe(false);
        });
    });

    it("creates water mask texture from one-byte water mask data, if it exists", function () {
      mockTerrain
        .willBeAvailable(rootTile)
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeDefined();
      });
    });

    it("uses undefined water mask texture for tiles that are entirely land", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(true, false, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeUndefined();
      });
    });

    it("uses shared water mask texture for tiles that are entirely water", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile)
        .requestTileGeometryWillSucceed(rootTile.southwestChild)
        .willHaveWaterMask(false, true, rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.data.waterMaskTexture).toBe(
            rootTile.southwestChild.data.waterMaskTexture
          );
        });
    });

    it("creates water mask texture from multi-byte water mask data, if it exists", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(true, true, rootTile);

      return processor.process([rootTile]).then(function () {
        expect(rootTile.data.waterMaskTexture).toBeDefined();
      });
    });

    it("upsamples water mask if data is not available", function () {
      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .willHaveWaterMask(false, true, rootTile)
        .requestTileGeometryWillSucceed(rootTile.southwestChild);

      return processor
        .process([rootTile, rootTile.southwestChild])
        .then(function () {
          expect(rootTile.southwestChild.data.waterMaskTexture).toBeDefined();
          expect(
            rootTile.southwestChild.data.waterMaskTranslationAndScale
          ).toEqual(new Cartesian4(0.0, 0.0, 0.5, 0.5));
        });
    });
  });

  describe(
    "pick",
    function () {
      var scene;

      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      it("gets correct results even when the mesh includes normals", function () {
        var terrainProvider = createWorldTerrain({
          requestVertexNormals: true,
          requestWaterMask: false,
        });

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 11,
          x: 3788,
          y: 1336,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var ray = new Ray(
            new Cartesian3(
              -5052039.459789615,
              2561172.040315167,
              -2936276.999965875
            ),
            new Cartesian3(
              0.5036332963145244,
              0.6648033332898124,
              0.5517155343926082
            )
          );
          var pickResult = tile.data.pick(ray, undefined, undefined, true);
          var cartographic = Ellipsoid.WGS84.cartesianToCartographic(
            pickResult
          );
          expect(cartographic.height).toBeGreaterThan(-500.0);
        });
      });

      it("gets correct result when a closer triangle is processed after a farther triangle", function () {
        // Pick root tile (level=0, x=0, y=0) from the east side towards the west.
        // Based on heightmap triangle processing order the west triangle will be tested first, followed
        // by the east triangle. But since the east triangle is closer we expect it to be the pick result.
        var terrainProvider = new EllipsoidTerrainProvider();

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var origin = new Cartesian3(50000000.0, -1.0, 0.0);
          var direction = new Cartesian3(-1.0, 0.0, 0.0);
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          var pickResult = tile.data.pick(
            ray,
            undefined,
            undefined,
            cullBackFaces
          );
          expect(pickResult.x).toBeGreaterThan(0.0);
        });
      });

      it("ignores triangles that are behind the ray", function () {
        // Pick root tile (level=0, x=0, y=0) from the center towards the east side (+X).
        var terrainProvider = new EllipsoidTerrainProvider();

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 0,
          x: 0,
          y: 0,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var origin = new Cartesian3(0.0, -1.0, 0.0);
          var direction = new Cartesian3(1.0, 0.0, 0.0);
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          var pickResult = tile.data.pick(
            ray,
            undefined,
            undefined,
            cullBackFaces
          );
          expect(pickResult.x).toBeGreaterThan(0.0);
        });
      });

      function base64ToArrayBuffer(base64) {
        var binary_string = window.atob(base64);
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
          bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
      }

      function loadTileAndPick(tileData, origin, direction) {
        function mockResource() {
          return {
            appendForwardSlash: function () {
              return this;
            },
            getDerivedResource: function () {
              return this;
            },
            fetchJson: function () {
              return when(arcGisTestData.metadata);
            },
            fetchArrayBuffer: function () {
              return when(tileData);
            },
          };
        }

        var terrainProvider = new ArcGISTiledElevationTerrainProvider({
          url: mockResource(),
          token: "something",
          ellipsoid: Ellipsoid.WGS84,
        });

        var tile = new QuadtreeTile({
          tilingScheme: new GeographicTilingScheme(),
          level: 11,
          x: 102,
          y: 103,
        });

        processor.frameState = scene.frameState;
        processor.terrainProvider = terrainProvider;

        return processor.process([tile]).then(function () {
          var ray = new Ray(origin, direction);
          var cullBackFaces = false;
          return tile.data.pick(
            ray,
            SceneMode.SCENE3D,
            undefined,
            cullBackFaces
          );
        });
      }

      it("should work for an arcgis heightmap tile", function () {
        return loadTileAndPick(
          arcGisTestData.tile_2.buffer,
          new Cartesian3(
            -1919497.530180931,
            -4780966.888096772,
            3750968.0087956334
          ),
          new Cartesian3(
            0.9973272510623228,
            -0.07143061383398,
            -0.015362997616719925
          )
        ).then((result) => {
          expect(result).toEqual(
            new Cartesian3(
              -1917529.1291086827,
              -4781107.869000195,
              3750937.687212673
            )
          );
        });
      });
    },
    "WebGL"
  );

  describe("eligibleForUnloading", function () {
    beforeEach(function () {
      processor.mockWebGL();
    });

    it("returns true when no loading has been done", function () {
      rootTile.data = new GlobeSurfaceTile();
      expect(rootTile.data.eligibleForUnloading).toBe(true);
    });

    it("returns true when some loading has been done", function () {
      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor
        .process([rootTile])
        .then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(true);
          mockTerrain.createMeshWillSucceed(rootTile);
          return processor.process([rootTile]);
        })
        .then(function () {
          expect(rootTile.data.eligibleForUnloading).toBe(true);
        });
    });

    it("returns false when RECEIVING", function () {
      var deferred = when.defer();

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .requestTileGeometryWillWaitOn(deferred.promise, rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });

    it("returns false when TRANSFORMING", function () {
      var deferred = when.defer();

      mockTerrain
        .requestTileGeometryWillSucceed(rootTile)
        .createMeshWillSucceed(rootTile)
        .createMeshWillWaitOn(deferred.promise, rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });

    it("returns false when imagery is TRANSITIONING", function () {
      var deferred = when.defer();

      var mockImagery = new MockImageryProvider();
      imageryLayerCollection.addImageryProvider(mockImagery);

      mockImagery.requestImageWillWaitOn(deferred.promise, rootTile);

      mockTerrain.requestTileGeometryWillSucceed(rootTile);

      return processor.process([rootTile], 5).then(function () {
        expect(rootTile.data.eligibleForUnloading).toBe(false);
        deferred.resolve();
      });
    });
  });
});

var ArcGISTerrainType = "ArcGIS";
var CesiumWorldTerrainType = "CWT";

describe(
  "globe surface tile pick with terrain provider",
  function () {
    var scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      resetXHRPatch();
    });

    xit("seemed to return nil CTW", function () {
      return pick(
        CesiumWorldTerrainType,
        {
          level: 9,
          x: 758,
          y: 177,
        },
        new Ray(
          new Cartesian3(
            311857.55464949476,
            5656003.706636155,
            2926806.329895747
          ),
          new Cartesian3(
            0.8350919260620685,
            0.057571663780277935,
            -0.5470895525921834
          )
        ),
        27.47724158244775,
        86.83596141629846,
        2267.7117421569124
      );
    });

    it("should pick CWT 1", function () {
      return pick(
        CesiumWorldTerrainType,
        {
          level: 13,
          x: 12148,
          y: 2822,
        },
        new Ray(
          new Cartesian3(
            294572.06453976966,
            5637826.573008351,
            2978624.6868285
          ),
          new Cartesian3(
            0.9682579127848576,
            -0.23448864932548388,
            0.08655453579692586
          )
        ),
        27.987476722110003,
        86.92709550300602,
        8648.509232163899
      );
    });

    it("should pick ArcGIS 1", function () {
      return pick(
        ArcGISTerrainType,
        {
          level: 13,
          x: 6074,
          y: 3432,
        },
        new Ray(
          new Cartesian3(
            294570.8548138021,
            5637823.198008731,
            2978631.1945253233
          ),
          new Cartesian3(
            0.9456141995659008,
            -0.3051366690223705,
            0.11271822744025553
          )
        ),
        27.99134174541378,
        86.930762403258,
        8263.848056698958
      );
    });

    it("should pick ArcGIS 2", () => {
      return pick(
        ArcGISTerrainType,
        {
          level: 13,
          x: 6074,
          y: 3432,
        },
        new Ray(
          new Cartesian3(
            294598.65625736193,
            5637822.940060011,
            2978628.933213219
          ),
          new Cartesian3(
            0.966382191319884,
            -0.23499867020411117,
            0.10431244078286432
          )
        ),
        27.98885728722371,
        86.92604374347968,
        8702.236719579063
      );
    });
  },
  "WebGL"
);

function pick(
  terrainType,
  tileDetails,
  rayToPick,
  expectedLatitude,
  expectedLongitude,
  expectedHeight
) {
  var terrainProvider, tilingSceheme;
  if (terrainType === CesiumWorldTerrainType) {
    setupXHRCache("https://assets.cesium.com/1/", "Data/assets.cesium.com/1/");
    terrainProvider = createWorldTerrain();
    tilingSceheme = new GeographicTilingScheme();
  } else if (terrainType === ArcGISTerrainType) {
    var arcGISUrl =
      "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer/";
    setupXHRCache(arcGISUrl, "Data/elevation3d.arcgis.com/");
    terrainProvider = new ArcGISTiledElevationTerrainProvider({
      url: arcGISUrl,
    });
    tilingSceheme = new WebMercatorTilingScheme();
  } else {
    throw new Error("unknown terrain type");
  }

  var tile = new QuadtreeTile({
    tilingScheme: tilingSceheme,
    level: tileDetails.level,
    x: tileDetails.x,
    y: tileDetails.y,
  });

  var frameState = {
    context: {
      cache: {},
    },
  };

  var imageryLayerCollection = new ImageryLayerCollection();
  var processor = new TerrainTileProcessor(
    frameState,
    terrainProvider,
    imageryLayerCollection
  );

  processor.mockWebGL();

  return processor.process([tile]).then(function () {
    tile.data.boundingVolumeSourceTile = tile;
    expect(tile.data.terrainState).toEqual(TerrainState.READY);

    function cartesianToCartographic(cartesian) {
      return tile.tilingScheme.ellipsoid.cartesianToCartographic(cartesian);
    }

    var result = tile.data.pick(
      rayToPick, // ray
      SceneMode.SCENE3D, // mode
      undefined, // projection
      false, // cullBackFaces
      null, // result
      true, // useNewPicking
      tile // globeSurfaceTile
    );
    expect(result).toBeDefined();

    var toDeg = CesiumMath.toDegrees;
    var cartographic = result ? cartesianToCartographic(result) : null;

    expect(toDeg(cartographic.longitude)).toBeCloseTo(expectedLongitude, 0);
    expect(toDeg(cartographic.latitude)).toBeCloseTo(expectedLatitude, 0);
    expect(cartographic.height).toBeCloseTo(expectedHeight, 0);
  });
}
