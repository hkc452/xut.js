import iconsConfig from '../../toolbar/base/iconconf.js'
import { svgIcon } from '../../toolbar/base/svgicon'
import { config } from '../../config/index'


const transform = Xut.style.transform
const translateZ = Xut.style.translateZ


const createSVGIcon = function(el, callback) {
    var options = {
        speed: 6000,
        onToggle: callback
    };
    return new svgIcon(el, iconsConfig, options);
}


const createCloseIcon = function() {
    const proportion = config.proportion
    const width = proportion.width * 55
    const height = proportion.height * 70
    const top = proportion.height * 10
    const right = config.viewSize.left ? Math.abs(config.viewSize.left) + (top * 2) : top * 2
    const html =
        `<div class="si-icon xut-scenario-close" 
                 data-icon-name="close" 
                 style="width:${width}px;height:${height}px;top:${top}px;right:${right}px">
            </div>'`
    return $(html)
}


const START_X = 0
const START_Y = 0


/**
 * 缩放平移
 * @param {[type]} node [description]
 */
export default class Pinch {


    /**
     * 创建按钮
     * @return {[type]} [description]
     */
    _createPinchButton() {
        const $pinchButton = createCloseIcon()
        createSVGIcon($pinchButton[0], () => {
            this.data.scale = 1;
            this.data.translate.x = START_X;
            this.data.translate.y = START_Y;
            this._requestUpdate()
            this._pinchButtonHide()
            isStart = false
        })
        this.$pinchNode.after($pinchButton)
        return $pinchButton
    }


    /**
     * 缩放按钮显示
     * @return {[type]} [description]
     */
    _pinchButtonShow() {
        if (this._$pinchButton) {
            this._$pinchButton.show()
        } else {
            this._$pinchButton = this._createPinchButton()
        }
        this.isRunning = true
    }


    /**
     * 缩放按钮隐藏
     * @return {[type]} [description]
     */
    _pinchButtonHide() {
        this._$pinchButton.hide()
        this.isRunning = false
    }


    /**
     * 相关母版
     * @return {[type]} [description]
     */
    _relatedMasterNode(pageIndex) {
        let belongMaster = Xut.Presentation.GetPageObj('master', pageIndex)
        if (belongMaster) {
            return belongMaster.getContainsNode()[0]
        }
    }


    /**
     * 更新样式
     * @return {[type]} [description]
     */
    _requestUpdate() {

        const updateTransform = () => {
            const data = this.data
            const styleText =
                `translate(${data.translate.x}px,${data.translate.y}px) ${translateZ}
                  scale(${data.scale},${data.scale})`
            this.pinchNode.style[transform] = styleText
            if (this.masterNode) {
                this.masterNode.style[transform] = styleText
            }
            this.ticking = false
        }

        if (!this.ticking) {
            Xut.nextTick(updateTransform)
            this.ticking = true
        }
    }


    _initBind() {
        this.hammer = new Hammer.Manager(this.pinchNode)
        const pinch = new Hammer.Pinch()
        this.hammer.add([pinch])
        this.hammer.on('pinchstart', e => {
            this._onPinchStart(e, pinch)
        })
        this.hammer.on('pinchmove', e => {
            this._onPinchMove(e)
        })
        this.hammer.on('pinchend', e => {
            this._onPinchEnd(e)
        })
    }


    _onPinchStart(event, pinch) {
        this.initScale = this.data.scale
        if (!this.hammer.get('pan')) {
            this.hammer.add(new Hammer.Pan())
                //取消冒泡 pinch层滑动 li层不可滑动
                // event.srcEvent.stopPropagation()
                // this.hammer.get('pan').set({ enable: true });

            // this.hammer.on("panstart", e => {
            //     this._onPanStart(e)
            // })
            // this.hammer.on("panmove", e => {
            //     this._onPanMove(e)
            // })
            // this.hammer.on("panend", e => {
            //     this._onPanEnd(e)
            // })
            this._pinchButtonShow()
        } else {
            if (!this.isRunning) {
                this._pinchButtonHide()
            }
        }
    }


    _onPinchMove(event) {

        if (this.data.scale > 1) {
            //缩放时，阻止冒泡
            event.srcEvent.stopPropagation()
                // const pan = this.hammer.get('pan')
                // pan && pan.set({ enable: true })
        }

        //缩放比
        this.data.scale = this.initScale * event.scale

        this._requestUpdate()
    }

 
    _onPinchEnd(event) {
        //还原缩放比
        if (this.data.scale <= 1) {
            this.data.scale = 1
            this._pinchButtonHide()
        }
    }


    _onPanStart(event) {

        if (this.data.scale > 1) {
            if (this.currentX != START_X || this.currentY != START_Y) {
                this.data.translate = {
                    x: this.currentX + event.deltaX,
                    y: this.currentY + event.deltaY
                }
            } else {
                this.data.translate = {
                    x: START_X + event.deltaX,
                    y: START_Y + event.deltaY
                }
            }
            this._isBoundry(event)
            this._requestUpdate();
        } else {
            //不取消冒泡 禁止pinch层滑动 此时li层可以滑动
            // this.hammer.get('pan').set({ enable: false });
        }
    }

    _onPanMove() {
        this._isBoundry()
    }

    _onPanEnd() {
        this.currentX = data.translate.x
        this.currentY = data.translate.y
    }


    /**
     * 边界判断
     * @return {Boolean} [description]
     */
    _isBoundry() {
        const pinchNode = this.pinchNode
        const scale = this.data.scale
        const horizontalBoundry = (scale - 1) / 2 * pinchNode.offsetWidth;
        const verticalBoundry = (scale - 1) / 2 * pinchNode.offsetHeight;
        if (scale > 1) {
            //左边界
            if (this.data.translate.x >= horizontalBoundry) {
                this.data.translate.x = horizontalBoundry
            }
            //右边界
            if (this.data.translate.x <= -horizontalBoundry) {
                this.data.translate.x = -horizontalBoundry
            }
            //上边界
            if (this.data.translate.y >= verticalBoundry) {
                this.data.translate.y = verticalBoundry
            }
            //下边界
            if (this.data.translate.y <= -verticalBoundry) {
                this.data.translate.y = -verticalBoundry
            }
        } else {
            this.data.scale = 1
            this.data.translate.x = START_X
            this.data.translate.y = START_Y
        }
    }


    constructor({
        $pagePinch,
        pageIndex
    }) {

        /**
         * 初始缩放值
         * @type {Number}
         */
        this.initScale = 1

        /**
         * 是否运行中
         * @type {Boolean}
         */
        this.isRunning = false

        /**
         * 是否更新中
         * @type {Boolean}
         */
        this.ticking = false

        /**
         * 需要更新的数据
         * @type {Object}
         */
        this.data = {
            translate: {
                x: START_X,
                y: START_Y
            },
            scale: 1
        }

        this.currentX = START_X
        this.currentY = START_Y

        this.$pinchNode = $pagePinch

        this.pinchNode = $pagePinch[0]

        //母版
        this.masterNode = this._relatedMasterNode(pageIndex)

        //bind event
        this._initBind()
    }

    destroy() {
        mc.destroy()
    }

}