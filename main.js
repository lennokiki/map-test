$(function () {
  var map = new Map('container')
  var customSpeed = ''
  var customCount = ''
  var prevOptions = {}
  var options = prevOptions = getOptions()
  $('#updateWrap').hide()

  function render() {
    renderStart()
    options = getOptions()
    map.render(options, renderEnd)
  }

  function renderStart() {
    $('#text').hide()
    $('#loading').show()
    $('#empty').show()
  }

  function renderEnd() {
    $('#empty').hide()
    $('#loading').hide()
  }

  function getOptions() {
    var engine = $('#mEngine').val()
    var type = $('#mType').val()
    var speed = $('#mSpeed').val()
    var update = $('#mUpdate').val()
    var count = $('#mCount').val()
    var style = $('input[name="mStyle"]:checked').val()
    var circle = $('input[name="mCircle"]:checked').val()
    console.log('circle', circle)

    if (speed === '-2') {
      speed = customSpeed
    }

    if (count === '-2') {
      count = customCount
    }

    return {
      engine: engine,   // 引擎类别
      type: type,       // 点icon
      speed: speed,     // 动态点速度
      update: update,   // 动态点更新频率
      count: count,     // 点渲染数量
      style: style,     // 点渲染模式
      circle: circle,   // 是否渲染 探测圈或者探测线图层
    }

  }

  // mapbox不使用setInterval的方式进行动画展示
  $('#mEngine').change(function(evt) {
    var val = evt.target.value
    if (val === 'Mapbox') {
      $('#updateWrap').hide()
    } else {
      $('#updateWrap').show()
    }
  })

  // 自定义速度
  $('#mSpeed').change(function (evt) {
    var val = evt.target.value
    if (val === '-2') {
      var res = window.prompt('请输入自定义速度', '')

      if (res != null) {
        if (typeof +res !== 'number' || isNaN(+res)) {
          $("#mSpeed").val(prevOptions.speed)
          return alert('请输入有效的数值')
        }
        customSpeed = res
        $("#mSpeed").find("option:selected").text('自定义：' + res)
        prevOptions.speed = val
      } else {
        $("#mSpeed").val(prevOptions.speed)
      }
    } else {
      prevOptions.speed = val
    }
  })

  // 自定义数量
  $('#mCount').change(function (evt) {
    var val = evt.target.value
    if (val === '-2') {
      var res = window.prompt('请输入自定义数量', '')

      if (res != null) {
        if (typeof +res !== 'number' || isNaN(+res)) {
          $("#mCount").val(prevOptions.count)
          return alert('请输入有效的数值')
        }
        customCount = res
        $("#mCount").find("option:selected").text('自定义：' + res)
        prevOptions.count = val
      } else {
        $("#mCount").val(prevOptions.count)
      }
    } else {
      prevOptions.count = val
    }
  })

  // 生成
  $('#submit').click(render)
})