var mapbox_accesstoken = 'pk.eyJ1IjoibGVubm9raWtpIiwiYSI6ImNrZGVoN25hNTA2dnYyenQxNnowc2szYm0ifQ.kS0hD4CtgSNx8GLGp7q-MA'
var IconConfig = {
  default: {
    size: 30,
    image: 'images/default.png'
  },
  plane: {
    size: 30,
    image: 'images/plane.png'
  },
  tank: {
    size: 30,
    image: 'images/tank.png'
  },
  bike: {
    size: 30,
    image: 'images/bike.png'
  }
}

var ColorList = [
  'orange',
  'yellow',
  'green',
  'purple',
  'pink',
  'black',
  'navy',
  'fuchsia',
  'blue',
  'red'
]

var mapUtils = {
  mockCoordinate: function () {
    return [this.randomRange(0, 360), this.randomRange(0, 90)]
  },
  transformSpeedToLonLat: function (speed, coordinates) {
    var secondSpeed = speed * 1000 / 3600
    var dis = secondSpeed * 1 // / 25  // 每一帧移动的距离
    var arc = Math.random() * 360
    var nextLon = +coordinates[0] + (dis * Math.cos(arc * Math.PI / 180)) / 111000
    var nextLat = +coordinates[1] + (dis * Math.sin(arc * Math.PI / 180)) / 111000
    return [nextLon, nextLat]
  },
  randomRange: function (start, end) {
    var r = Math.random()
    var num = r * end + start
    num = +num.toFixed(13)
    return r > 0.5 ? -num : num
  },
  randomCircleAndLineData: function () {
    var unit = Math.random()
    return {
      radius: Math.floor(unit * 100) + 30,
      type: unit > 0.5 ? 'line' : 'circle',
      color: ColorList[Math.floor(unit * 10)],
      anchor: Math.floor(unit * 360) * Math.PI / 180
    }
  }
}

/* mapbox引擎 */
class Mapbox {
  instance = null
  layerId = null
  circleLayer = null

  marks = []
  mapLoaded = false
  timer = null
  
  constructor (elem) {
    this.init(elem)
  }

  init (elem) {
    mapboxgl.accessToken = mapbox_accesstoken;
    this.instance = new mapboxgl.Map({
      container: elem,
      zoom: 1,
      style: 'mapbox://styles/mapbox/streets-v11'
    });
  }

  draw (options, callback) {
    console.log('mapbox绘制')
    this.options = options
    this.clear()
    if (options.style === '1') {
      this.renderStaticMarkerWithLayer()
    }
    if (options.style === '2') {
      this.renderDynamicMarkerWithLayer()
    }
    callback && callback()
  }

  clear (callback) {
    if (this.layerId) {
      this.clearTimer()
      var map = this.instance
      this.clearCircle(map)
      this.clearLine(map)
      map.removeLayer(this.layerId)
      map.removeSource('points')
      this.layerId = null
      if (map.hasImage('custom-icon')) {
        map.removeImage('custom-icon')
      }
      callback && callback()
      console.log('mapbox清除')
    }
  }

  clearCircle (map) {
    if (map && map.getSource('circleSource')) {
      map.removeLayer('circleLayer')
      map.removeSource('circleSource')
    }
  }

  clearLine (map) {
    if (map && map.getSource('lineSource')) {
      map.removeLayer('lineLayer')
      map.removeSource('lineSource')
    }
  }

  clearTimer () {
    if (this.timer != null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  dispose (callback) {
    this.clearTimer()
    this.instance.remove()
    this.mapLoaded = false
    this.instance = null
    callback && callback()
    console.log('mapbox销毁地图实例')
  }

  generateStaticData () {
    var list = []
    var count = this.options.count
    var type = this.options.type
    var icon = IconConfig[type]
    for (var i = 0; i < count; i++) {
      var coordinates = mapUtils.mockCoordinate() 
      var circleProperties = mapUtils.randomCircleAndLineData()
      var nextProperties = Object.assign({}, {
        message: type,
        iconSize: [icon.size, icon.size],
      }, circleProperties)

      var obj = {
        type: 'Feature',
        properties: nextProperties,
        geometry: {
          type: 'Point',
          coordinates: coordinates 
        },
        image: icon.image
      }

      list.push(obj)
    }

    return list
  }

  renderLayer () {
    var layerId = this.layerId = 'points'
    var imageUrl = IconConfig[this.options.type]['image']
    var iconName = 'custom-icon'
    var list = this.generateStaticData()
    var nextList = list.map(function(marker){
      return {
        type: 'Feature',
        geometry: marker.geometry,
        properties: marker.properties
      }
    })
    var map = this.instance
    var self = this
    
    map.loadImage(
      imageUrl,
      function (error, image) {
        if (error) {
          console.log('throw error', error)
          throw error
        };

        if (map.hasImage(iconName)) {
          map.updateImage(iconName, image)
        } else {
          map.addImage(iconName, image)
        }
        map.addSource(
          'points',
          {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: nextList
            }
          }
        )

        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: 'points',
          layout: {
            'icon-image': iconName,
            "icon-size": 0.15
          }
        });

        if (self.options.circle === '1') {
          var res = self.renderCircleAndLineLayer(nextList)
          self.genNextLayer(res.lineFeatures, res.circleFeatures)
        }
      }
    )
  }

  genNextLayer (lineFeatures, circleFeatures) {
    var map = this.instance
    map.addSource(
      'circleSource',
      {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: circleFeatures
        }
      }
    )

    map.addSource(
      'lineSource',
      {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: lineFeatures
        }
      }
    )

    map.addLayer({
      id: 'lineLayer',
      type: 'line',
      source: 'lineSource',
      paint: {
        'line-width': 2,
        'line-color': ['get', 'color']
      }
    })

    map.addLayer({
      id: 'circleLayer',
      type: 'circle',
      source: 'circleSource',
      paint: {
        'circle-radius': ['get', 'size'],
        'circle-color': 'transparent',
        "circle-stroke-width": 2,
        'circle-stroke-color': ['get', 'color']
      }
    })
  }

  renderCircleAndLineLayer (list) {
    var lineFeatures = []
    var circleFeatures = []
    
    list.forEach(function (item) {
      var type = item.properties.type === 'circle' ? 'Point' : 'LineString'
      var coordinates = item.geometry.coordinates
      var feature = null
      if (type === 'Point') {
        feature = {
          type: 'Feature',
          geometry: {
            type: type,
            coordinates: coordinates
          },
          properties: {
            radius: item.properties.radius,
            color: item.properties.color,
            size: item.properties.radius,
          }
        }
        circleFeatures.push(feature)
      }

      if (type === 'LineString') {
        var dis = 10 * 300000
        var nextX = coordinates[0] + (dis * Math.cos(item.properties.anchor)) / 111000
        var nextY = coordinates[1] + (dis * Math.sin(item.properties.anchor)) / 111000
        feature = {
          type: 'Feature',
          geometry: {
            type: type,
            coordinates: [
              coordinates,
              [nextX, nextY]
            ]
          },
          properties: {
            color: item.properties.color
          }
        }

        lineFeatures.push(feature)
      }
    })

    return {
      lineFeatures: lineFeatures,
      circleFeatures: circleFeatures
    }
  }

  drawPointRandom(prevData){
    var speed = this.options.speed
    prevData.features.forEach(function (item) {
      // var lon = Math.random() > 0.5 ? -0.06 : 0.06
      // var lat = Math.random() > 0.5 ? -0.06 : 0.06
      var nextCoordinates = mapUtils.transformSpeedToLonLat(speed, item.geometry.coordinates)
      // var nextCoordinates = [item.geometry.coordinates[0] + lon, item.geometry.coordinates[1] + lat];
      item.geometry.coordinates = nextCoordinates
    })

    return prevData
  }

  animateMarker() {
    var map = this.instance
    var prevData = map.getSource('points')._data
    var nextData = this.drawPointRandom(prevData)
    map.getSource('points').setData(nextData);
    if (this.options.circle === '1') {
      var res = this.renderCircleAndLineLayer(nextData.features)
      map.getSource('circleSource').setData({
        type: 'FeatureCollection',
        features: res.circleFeatures
      })
      map.getSource('lineSource').setData({
        type: 'FeatureCollection',
        features: res.lineFeatures
      })
    }

    // requestAnimationFrame(this.animateMarker.bind(this));
  }

  renderDyncmicLayer () {
    var self = this
    var layerId = this.layerId = 'points'
    var imageUrl = IconConfig[this.options.type]['image']
    var iconName = 'custom-icon'
    var list = this.generateStaticData()

    var nextList = list.map(function(marker){
      return {
        type: 'Feature',
        geometry: marker.geometry,
        properties: marker.properties
      }
    })
    var map = this.instance

    map.loadImage(
      imageUrl,
      function (error, image) {
        if (error) {
          console.log('throw error', error)
          throw error
        };

        if (map.hasImage(iconName)) {
          map.updateImage(iconName, image)
        } else {
          map.addImage(iconName, image)
        }

        map.addSource(
          'points',
          {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: nextList
            },
            tolerance: 1
          }
        )

        map.addLayer({
          id: layerId,
          type: 'symbol',
          source: 'points',
          layout: {
            'icon-image': iconName,
            "icon-size": 0.1
          }
        });
        if (self.options.circle === '1') {
          var res = self.renderCircleAndLineLayer(nextList)
          self.genNextLayer(res.lineFeatures, res.circleFeatures)
        }
        self.timer = setInterval(self.animateMarker.bind(self), self.options.update)
        // self.animateMarker(0)
      }
    )
  }
  
  //渲染静态节点使用layer
  renderStaticMarkerWithLayer () {
    var self = this
    if (!self.mapLoaded) {
      self.instance.on('load', function () {
        self.mapLoaded = true
        self.renderLayer()
      })
    } else {
      self.renderLayer()
    }
  }

  renderDynamicMarkerWithLayer () {
    var self = this
    if (!self.mapLoaded) {
      self.instance.on('load', function () {
        self.mapLoaded = true
        self.renderDyncmicLayer()
      })
    } else {
      self.renderDyncmicLayer()
    }
  }


  // 渲染静态节点
  renderStaticMarker () {
    var self = this
    var list = this.generateStaticData()

    list.forEach(function(marker) {
      var el = document.createElement('div');
      el.className = 'marker';
      el.style.background = marker.image
      el.style.backgroundSize = "100% 100%"
      el.style.width = marker.properties.iconSize[0] + 'px';
      el.style.height = marker.properties.iconSize[1] + 'px';
      // add marker to map
      var mark = new mapboxgl.Marker(el)
        .setLngLat(marker.geometry.coordinates)
        .addTo(self.instance);
      self.marks.push(mark)
    })
  }
}

/* openlayers引擎 */
class Openlayers {
  instance = null
  vectorLayer = null
  circleAndLineLayer = null
  options = null
  timer = null
  
  constructor (elem) {
    this.init(elem)
  }

  init (elem) {
    this.instance = new ol.Map({
      interactions: ol.interaction.defaults().extend([new ol.interaction.DragRotateAndZoom()]),
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      target: elem,
      view: new ol.View({
        center: [0, 0],
        zoom: 2
      })
    })
  }

  draw (options, callback) {
    console.log('openlayers绘制')
    this.options = options
    this.clear()
    if (options.style === '1') {
      this.drawStaticLayer()
    }
    if (options.style === '2') {
      this.drawDynamicLayer()
    }
    callback && callback()
  }

  drawFeatures () {
    var features = []
    var image = this.drawIcon()
    for (let i = 0; i < this.options.count; i++) {
      var origin = mapUtils.mockCoordinate()
      var point = ol.proj.fromLonLat(origin)
      var originProperty = {
        geometry: new ol.geom.Point(point),
        customGeo: origin,
      }
      var otherProperty = mapUtils.randomCircleAndLineData()
      var obj = Object.assign({}, originProperty, otherProperty)
      var iamgeFeature = new ol.Feature(obj)
      iamgeFeature.setStyle(image)
      features.push(iamgeFeature)
    }
    return features
  }

  drawIcon () {
    var imageUrl = IconConfig[this.options.type].image
    var imageStyle = new ol.style.Icon({
      anchor: [0.5, 46],
      scale: 0.15,
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      src: imageUrl
    })
    return new ol.style.Style({image: imageStyle})
  }

  // 画底图点
  drawVectorLayer (features) {
    var vectorSource = new ol.source.Vector({features: features})
    var vectorLayer = this.vectorLayer = new ol.layer.Vector({source: vectorSource})
    this.instance.addLayer(vectorLayer)
  }

  // 画地图点圈或者线
  drawCircleAndLineLayer (features) {
    var nextFeatures = []
    features.forEach(function (item) {
      var properties = item.getProperties()
      var color = properties.color
      var radius = properties.radius
      var type = properties.type
      var anchor = properties.anchor
      var customGeo = properties.customGeo
      var feature = null
      var dis = 10 * 100000
      if (type === 'circle') {
        var point = ol.proj.fromLonLat(customGeo)
        var geom =  new ol.geom.Point(point);
        feature = new ol.Feature(geom);
        var style = new ol.style.Style({
          image: new ol.style.Circle({
            radius: radius,
            fill: null,
            stroke: new ol.style.Stroke({ color: color, width: 2 })
          })
        })
        feature.setStyle(style)
      }
      if (type === 'line') {
        var startPoint = ol.proj.fromLonLat(customGeo)
        var nextX = customGeo[0] + (dis * Math.cos(anchor)) / 111000
        var nextY = customGeo[1] + (dis * Math.sin(anchor)) / 111000
        var endPoint = ol.proj.fromLonLat([nextX, nextY])

        var geom = new ol.geom.LineString([startPoint, endPoint])
        feature = new ol.Feature(geom)
        var style = new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: color,
            width: 2,
          })
        })
        feature.setStyle(style)
      }

      nextFeatures.push(feature)
    })

    var source = new ol.source.Vector({features: nextFeatures})
    var layer = this.circleAndLineLayer = new ol.layer.Vector({source: source})
    this.instance.addLayer(layer)
  }

  drawStaticLayer () {
    var features = this.drawFeatures()
    this.drawVectorLayer(features)
    if (this.options.circle === '1') {
      this.drawCircleAndLineLayer(features)  
    }
  }

  startAnimation () {
    var source = this.vectorLayer.getSource()
    var features = source.getFeatures()
    var speed = this.options.speed
    features.forEach(function(item) {
      var geometry = item.getGeometry()
      var properties = item.getProperties()
      var nextGeo = mapUtils.transformSpeedToLonLat(speed, properties.customGeo)
      item.setProperties({customGeo: nextGeo})
      geometry.setCoordinates(ol.proj.fromLonLat(nextGeo))
    })

    this.clearCircleAndLineLayer()
    if (this.options.circle === '1') {
      this.drawCircleAndLineLayer(features)  
    }
    this.instance.render()
    // requestAnimationFrame(this.startAnimation.bind(this))
  }

  clearCircleAndLineLayer () {
    this.circleAndLineLayer && this.instance.removeLayer(this.circleAndLineLayer)
    this.circleAndLineLayer = null
  }

  drawDynamicLayer () {
    this.drawStaticLayer()
    // this.startAnimation()
    this.timer = setInterval(this.startAnimation.bind(this), this.options.update)
  }
  
  clear (callback) {
    console.log('openlayers清除画布')
    this.clearTimer()
    this.vectorLayer && this.instance.removeLayer(this.vectorLayer)
    this.vectorLayer = null
    this.clearCircleAndLineLayer()
    callback && callback()
  }

  clearTimer () {
    if (this.timer != null) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  dispose (callback) {
    console.log('openlayers销毁地图实例')
    this.clearTimer()
    this.instance && this.instance.disposeInternal()
    callback && callback()
  }
}

/* leaflet引擎 */
class Leaflet {
  instance = null
  timer = null
  options = null
  imageData = {}

  constructor (elem) {
    this.init(elem)
  }

  loadImage () {
    var self = this
    Object.keys(IconConfig).forEach(function(key) {
      var url = IconConfig[key]['image']
      var img = new Image()
      img.onload = function () {
        (self.imageData)[key] = img
      }
      img.src = url
    })
  }

  init (elem) {
    this.instance = L.map(elem, {
      center: [0, 0],
      zoom: 13
    });
    L.tileLayer(`https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=${mapbox_accesstoken}`, {
      // attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      maxZoom: 3,
      id: 'mapbox/streets-v11',
      tileSize: 512,
      zoomOffset: -1,
      accessToken: mapbox_accesstoken
    }).addTo(this.instance);
  }

  // drawIcon () {
  //   var imageUrl = IconConfig[this.options.type].image
  //   return L.icon({
  //     iconUrl: imageUrl,
  //     iconSize: [30, 30],
  //     iconAnchor: [22, 94],
  //     // popupAnchor: [-3, -76],
  //     // shadowUrl: 'my-icon-shadow.png',
  //     // shadowSize: [68, 95],
  //     // shadowAnchor: [22, 94]
  //   })
  // }

  // generateMarker () {
  //   var myRenderer = L.canvas();
  //   var markers = []
  //   var icon = this.drawIcon()
  //   var i = 0,
  //     count = this.options.count
  //   for (var i = 0; i < count; i++) {
  //     var geometry = mapUtils.mockCoordinate()
  //     var marker = L.marker(geometry, {icon: icon, renderer: myRenderer})
  //     markers.push(marker)
  //   }
  //   return markers
  // }

  drawCustomLayer () {
    var _self = this
    var canvasLayer = L.GridLayer.extend({
      options: {
        radius: 5, // this is the default radius (specific radius values may be passed with the data)
        useAbsoluteRadius: true,  // true: radius in meters, false: radius in pixels
        color: '#000',
        opacity: 0.5,
        noMask: false,  // true results in normal (filled) circled, instead masked circles
        lineColor: undefined,  // color of the circle outline if noMask is true
        debug: false,
        zIndex: 18 // if it is lower, then the layer is not in front
      },
    
      initialize: function (options) {
        L.setOptions(this, options);
      },
      
      createTile: function (coords) {
        var tile = L.DomUtil.create('canvas', 'leaflet-title')
        var size = this.getTileSize()
        tile.width = size.x
        tile.height = size.y
        this._draw(tile, coords)
        return tile
      },

      _draw (tile, coords) {
        if (!this._data) {
          return 
        }
        var ctx = tile.getContext('2d')
        var _maskMap = this
        this._data.forEach(function(data) {
          var img = _self.imageData[_self.options.type]
          var point = _maskMap._map.project(new L.LatLng(data[0], data[1]), coords.z)
          var x = Math.floor(point.x)
          var y = Math.floor(point.y)
          ctx.drawImage(img, x, y, 30, 30);
        })
      },

      setData (dataSet) {
        this._data = dataSet
        if (this._map) {
          this.redraw()
        }
      },
    })

    return canvasLayer
  }

  genMockGeometry () {
    var markers = []
    var count = this.options.count
    for (var i = 0; i < count; i++) {
      var geometry = mapUtils.mockCoordinate()
      markers.push(geometry)
    }
    return markers
  }

  drawStaticLayer () {
    var mask = this.drawCustomLayer()
    this.layer = new mask()
    var data = this.genMockGeometry()
    this.layer.setData(data)
    this.instance.addLayer(this.layer)
  }

  drawDynamicLayer () {

  }

  draw (options, callback) {
    var self = this
    this.options = options
    this.clear()
    this.loadImage()
    setTimeout(function() {
      if (options.style === '1') {
        self.drawStaticLayer()
      }
      if (options.style === '2') {
        self.drawDynamicLayer()
      }
      callback && callback()
      console.log('leaflet绘制图标')
    }, 1000)

  }

  clear (callback) {
    if (this.layerId) {
      this.instance.removeLayer(this.layerId)
      this.layerId = null
    }
    console.log('leaflet清除地图图层')
    callback && callback()
  }

  clearTimer () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  dispose (callback) {
    this.timer && clearInterval(this.timer)
    this.instance && this.instance.remove()
    callback && callback()
    console.log('leaflet实例销毁')
  }
  
}



class Map {
  elem = null
  options = null
  prevOptions = null
  map = null
  
  mapDict = {
    Mapbox: 'adapterMapbox',
    Openlayers: 'adapterOpenlayers',
    Leaflet: 'adapterLeaflet',
  }
  
  constructor (elem) {
    this.elem = elem
  }

  // 初始化方法
  render (options, callback) {
    this.prevOptions = this.options
    this.options = options
    this.drawcallback = callback
    if (
      !this.map ||
      options.engine !== this.prevOptions.engine
    ) {
      console.log('初始生成地图')
      this.dispose()
      this.generateMap()
    }
    this.draw()
  }

  //mapbox实例
  adapterMapbox () {
    this.map = new Mapbox(this.elem)
  }

  //openlayers实例
  adapterOpenlayers () {
    this.map = new Openlayers(this.elem)
  }

  // leaflet实例
  adapterLeaflet () {
    this.map = new Leaflet(this.elem)
  }
 
  // 生成地图实例
  generateMap () {
    var engine = this.options.engine
    this[this.mapDict[engine]]()
  }

  // 清除地图上所有绘点
  clear () {
    this.map && this.map.clear()
  }

  // 清除地图实例
  dispose () {
    this.map && this.map.dispose()
    this.map = null
  }

  // 绘制点
  draw () {
    this.map && this.map.draw(this.options, this.drawEnd.bind(this))
  }

  drawEnd () {
    var self = this
    setTimeout(function() {
      self.drawcallback && self.drawcallback()
    }, 2000)
  }
}

window.Map = Map