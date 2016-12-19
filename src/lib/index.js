import { config } from './config/index'
import { api } from './global.api'
import { AudioManager } from './component/audio/manager'
import { VideoManager } from './component/video/manager'
import { fixAudio } from './component/audio/fix'
import { setDelay, disable } from './initialize/busy.cursor'
import nextTick from './util/nexttick'
import init from './initialize/index'

Xut.Version = 873.4


if (Xut.plat.isBrowser) {

    /**
     * 禁止全局的缩放处理
     * @return {[type]}    [description]
     */
    $('body').on('touchmove', function(e) {
        e.preventDefault && e.preventDefault()
    })

    //Mobile browser automatically broadcast platform media processing
    if (Xut.plat.noAutoPlayMedia) {
        fixAudio()
    }
    //Desktop binding mouse control
    $(document).keyup(event => {
        switch (event.keyCode) {
            case 37:
                Xut.View.GotoPrevSlide()
                break;
            case 39:
                Xut.View.GotoNextSlide()
                break;
        }
    })
}

/**
 * 基本结构
 */
const getContentHTML = cursor => {
    //忙碌可配置
    let busyIcon = '<div class="xut-busy-icon xut-fullscreen"></div>'
    if (!cursor) {
        disable(true)
        busyIcon = ''
    }

    if (config.cursor && config.cursor.time) {
        setDelay(config.cursor.time)
    }

    let coverStyle = ''

    //mini平台不要背景图
    if (Xut.config.platform === 'mini') {} else {
        //默认背景图
        let coverUrl = './content/gallery/cover.jpg'
            //重写背景图
        if (window.DYNAMICCONFIGT && window.DYNAMICCONFIGT.resource) {
            coverUrl = window.DYNAMICCONFIGT.resource + '/gallery/cover.jpg'
        }
        //背景样式
        coverStyle = `style="background-image: url(${coverUrl});"`
    }

    return `${busyIcon}
            <div class="xut-cover xut-fullscreen" ${coverStyle}></div>
            <div class="xut-scene-container xut-fullscreen xut-overflow-hidden"></div>`
}

/**
 * 根节点
 */
const getNode = (nodeName = '#xxtppt-app-container', cursor = true) => {
    let $rootNode
    if (nodeName) {
        $rootNode = $(nodeName)
    }
    if (!$rootNode.length) {
        //如果没有传递节点名，直接放到body下面
        nodeName = ''
        $rootNode = $('body')
    }

    let contentHtml = getContentHTML(cursor)

    //如果根节点不存在,配置根节点
    if (!nodeName) {
        contentHtml = `<div id="xxtppt-app-container" class="xut-fullscreen xut-overflow-hidden">
                            ${contentHtml}
                       </div>`
    }

    return {
        $rootNode,
        $contentNode: $(String.styleFormat(contentHtml))
    }
}


/**
 * 接口接在参数
 * 用户横竖切换刷新
 * @type {Array}
 */
let lauchOptions


/**
 * 加载应用app
 * @return {[type]} [description]
 */
let loadApp = (...arg) => {
    let node = getNode(...arg)
    Xut.Application.$$removeNode = () => {
        node.$contentNode.remove()
        node.$contentNode = null
        node.$rootNode = null
        node = null
        Xut.Application.$$removeNode = null
    }
    nextTick({
        container: node.$rootNode,
        content: node.$contentNode
    }, init)
}

// $('body').on('dblclick', () => {
//     // alert(11)
//     Xut.Application.Refresh()
//     loadApp()
// })

/**
 * 横竖切换
 */
Xut.plat.isBrowser && $(window).on('orientationchange', () => {

    //安卓设备上,对横竖切换的处理反映很慢
    //所以这里需要延时加载获取设备新的分辨率
    //2016.11.8
    let delay = function(fn) {
        setTimeout(fn, 500)
    }

    //如果启动了这个模式
    if (config.orientateMode) {
        let temp = lauchOptions
        Xut.Application.Refresh()
        if (temp && temp.length) {
            delay(() => {
                Xut.Application.Launch(temp.pop())
                temp = null
            })
        } else {
            delay(() => {
                loadApp()
            })
        }
    }
})


/**
 * 提供全局配置文件
 */
let mixModeConfig = setConfig => {
    if (setConfig) {
        Xut.extend(config, setConfig)
    }
}

/**
 * 新版本加载
 */
Xut.Application.Launch = ({
    el,
    paths,
    launchAnim,
    cursor
}) => {
    let setConfig = Xut.Application.setConfig
    if (setConfig && setConfig.lauchMode === 1) {
        mixModeConfig(setConfig);
        lauchOptions = [{
            el,
            paths,
            cursor
        }]
        window.DYNAMICCONFIGT = { //外部配置文件
            resource: paths.resource,
            database: paths.database, //数据库
            launchAnim: launchAnim //启动动画
        }
        loadApp(el, cursor)
    }
}

/**
 * 老版本加载
 */
setTimeout(() => {
    let setConfig = Xut.Application.setConfig
    if (!setConfig || setConfig && !setConfig.lauchMode) {
        mixModeConfig(setConfig)
        loadApp()
    }
}, 100)
