/*********************************************************************
 *
 * content的动画类对象
 * 1 ppt 动画
 * 2 精灵动画
 * 3 show/hide接口
 * 4 canvas动画
 * @return {[type]} [description]
 *
 ********************************************************************/
import Powepoint from '../../../../plugin/extend/powerpoint/index'
import ComSprite from './sprite/com'
import AutoSprite from './sprite/auto'
import {
  clearContentAudio
} from '../../audio/manager'
import {
  makeJsonPack
} from '../../../../util/lang'

//2016.7.15废弃
//pixi暂时不使用
let pixiSpirit = {}
let pixiSpecial = {}

// import { Sprite as pixiSpirit } from '../pixi/sprite/index'
// import { specialSprite as pixiSpecial } from '../pixi/special/index'

/**
 * 销毁动画音频
 * @param  {[type]} videoIds  [description]
 * @param  {[type]} chapterId [description]
 * @return {[type]}           [description]
 */
const destroyAudio = (videoIds, chapterId) => {
  let isExist = false;
  //如果有音频存在
  videoIds && _.each(videoIds, (data) => {
    //如果存在对象音频
    if (data.videoId) {
      isExist = true;
      return 'breaker'
    }
  })
  if (isExist) {
    clearContentAudio(chapterId)
  }
}


/**
 * 4种扩展对象
 * @type {Array}
 */
const OBJNAME = [
  'pptObj',
  'pixiObj',
  'comSpriteObj',
  'autoSpriteObj'
]


/**
 * Traverse each value of OBJNAME
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
const access = (callback) => {
  OBJNAME.forEach((key) => {
    callback(key)
  })
}


/**
 * 动画效果
 * @param {[type]} options [description]
 */
export default class Animation {

  constructor(options, getStyle) {
    _.extend(this, options);
    this.getStyle = getStyle
  }


  /**
   * Build the canvas of animation
   * 比较复杂
   * 1 普通与ppt组合
   * 2 高级与ppt组合
   * 3 ppt独立
   * 4 普通精灵动画
   * 8  其中 高级精灵动画是widget创建，需要等待
   * @return {[type]} [description]
   */
  _createCanvas(id, parameter, category, callback) {

    let initstate

    //动作类型
    //可能是组合动画
    const actionTypes = this.contentDas.actionTypes
    const makeOpts = {
      data: this.contentDas,
      renderer: this.$contentNode,
      pageIndex: this.pageIndex
    }

    //创建pixi上下文的ppt对象
    const createPixiPPT = () => {
      //parameter存在就是ppt动画
      if ((parameter || actionTypes.pptId) && this.$contentNode.view) {
        this.pptObj = callback(Powepoint, $(this.$contentNode.view));
        this.pptObj.contentId = id
      }
    }

    const $veiw = this.$contentNode.view
    if ($veiw) {
      initstate = $veiw.getAttribute('data-init')
    }

    const setState = () => {
      $veiw.setAttribute('data-init', true)
    }

    //多个canvas对应多个ppt
    //容器不需要重复创建
    //精灵动画
    if (actionTypes.spiritId) {
      if (initstate) {
        createPixiPPT()
      } else {
        //加入任务队列
        this.nextTask.context.add(id)
        this.pixiObj = new pixiSpirit(makeOpts);
        //防止多条一样的数据绑多个动画
        //构建精灵动画完毕后
        //构建ppt对象
        this.pixiObj.$once('load', () => {
          //ppt动画
          createPixiPPT()

          //任务完成
          this.nextTask.context.remove(id)
        })
        setState()
      }
    }

    //特殊高级动画
    //必须是ppt与pixi绑定的
    if (actionTypes.compSpriteId) {
      // console.log(this,this.id,this.contentDas.initpixi)
      //这个dom已经创建了pixi了
      if (initstate) {
        createPixiPPT()
      } else {
        this.pixiObj = new pixiSpecial(makeOpts);
        setState()

        //ppt动画
        createPixiPPT()
      }

    }
  }


  /**
   * Build the dom of animation
   * @return {[type]} [description]
   */
  _createDom(category, callback) {

    if (category) {
      const data = {
        id: this.id,
        data: this.contentDas,
        $contentNode: this.$contentNode
      }
      switch (category) {
        //普通精灵动画
        case "Sprite":
          this.comSpriteObj = ComSprite(data)
          break
          //普通转复杂精灵动画
        case "AutoCompSprite":
          this.autoSpriteObj = new AutoSprite(data)
          break
      }
    }

    //ppt动画
    this.pptObj = callback(Powepoint)
  }


  /**
   * 绑定动画
   * 为了向上兼容API
   *  1 dom动画
   *  2 canvas动画
   *
   * 2 直接截断动画处理
   *   直接执行脚本动画
   */
  init(id, $contentNode, $containsNode, chapterId, parameter, pageType) {

    //预显示跳过动画创建
    if (this.prepVisible) {
      $contentNode.css({
        'visibility': this.prepVisible
      })
      return
    }

    //如果是被预处理截断，跳过动画创建
    //直接给脚本数据绑定click事件
    if (this.prepTruncation) {

      //增加一个特殊的标记
      //用于全局swipe过滤默认行为
      this.$contentNode.prop('prepTruncation', 'true')
      this.$contentNode.click(() => {
        try {
          makeJsonPack(this.prepTruncation)()
        } catch (err) {
          console.log(`预处理截断执行脚本失败`)
        }
      })
      return
    }

    //////////////////////////////
    /// PPT动画库
    //////////////////////////////
    let category = this.contentDas.category
    let pageIndex = this.pageIndex
    let create = (constr, newContext) => {
      let element = newContext || $contentNode
      if (element.length) {
        return new constr(pageIndex, pageType, chapterId, element, parameter, $containsNode, this.getStyle);
      } else {
        console.log(`创建:${constr}失败`)
      }
    }
    this.domMode ? this._createDom(category, create) : this._createCanvas(id, parameter, category, create)
  }

  /**
   * 显示预处理
   * 直接越过动画
   * @param  {[type]}  scope [description]
   * @return {Boolean}       [description]
   */
  _hasPrepVisible(playComplete) {
    //创建的无行为content
    let partContentRelated = this.base.relatedData.partContentRelated
      //针对空跳过处理
    if (partContentRelated && partContentRelated.length && (-1 !== partContentRelated.indexOf(this.id))) {
      playComplete()
    } else {
      //必须要修改
      if (this.$contentNode) {
        if (this.canvasMode) {
          console.log('canvsa prepVisible')
        } else {
          //因为执行的顺序问题，动画与页面零件
          //isscroll标记控制
          if (!this.$contentNode.attr('data-iscroll')) {
            let visibility = this.$contentNode.css('visibility')
              //必须是设定值与原始值不一致才修改
              //苹果上闪屏问题
            if (visibility != this.prepVisible) {
              this.$contentNode.css({
                'visibility': this.prepVisible
              })
            }
          }
        }
      }
      playComplete()
    }
  }

  /**
   * 运行动画
   * @param  {[type]} scopeComplete   [动画回调]
   * @param  {[type]} canvasContainer [description]
   * @return {[type]}                 [description]
   */
  play(playComplete) {

    //处理显示动画
    if (this.prepVisible) {
      this._hasPrepVisible(playComplete)
      return
    }

    //如果是被预处理截断
    if (this.prepTruncation) {
      return
    }

    var $contentNode = this.$contentNode

    //canvas
    if ($contentNode && $contentNode.view) {
      $contentNode = this.$contentNode.view
    }

    access((key) => {
      if (this[key]) {
        if (key === 'pptObj') {
          //优化处理,只针对互斥的情况下
          //处理层级关系
          if ($contentNode.prop && $contentNode.prop("mutex")) {
            $contentNode.css({ //强制提升层级
              'display': 'block'
            })
          }
        }
        this[key].play && this[key].play(playComplete)
      }
    })
  }


  /**
   * 停止动画
   * @param  {[type]} chapterId [description]
   * @return {[type]}           [description]
   */
  stop(chapterId) {
    //显示动画，处理截断
    if (this.prepVisible || this.prepTruncation) {
      return
    }
    access((key) => {
      if (this[key]) {
        if (key === 'pptObj') {
          //销毁ppt音频
          destroyAudio(this[key].options, chapterId);
        }
        this[key].stop && this[key].stop()
      }
    })
  }


  /**
   * 翻页结束，复位上一页动画
   * @return {[type]} [description]
   */
  reset() {
    //显示动画，处理截断
    if (this.prepVisible || this.prepTruncation) {
      return
    }
    access((key) => {
      this[key] && this[key].reset && this[key].reset()
    })
  }


  /**
   * 销毁动画
   * @return {[type]} [description]
   */
  destroy() {

    if (this.prepTruncation) {
      this.$contentNode.off()
      this.$contentNode = null
      return
    }

    access((key) => {
      this[key] && this[key].destroy && this[key].destroy()
    })

    //销毁renderer = new PIXI.WebGLRenderer
    if (this.canvasMode) {
      //rederer.destroy()
      this.$contentNode.view && this.$contentNode.destroy()
    }

    //销毁每一个数据上的canvas上下文引用
    if (this.contentDas.$contentNode) {
      this.contentDas.$contentNode = null;
    }

    access((key) => {
      this[key] = null
    })


    this.getParameter = null

  }

}
