/*
* @Author: Marte
* @Date:   2018-01-19 15:03:21
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-21 13:31:45
*/

'use strict';
function ContactorPresenter (view, model) {
    this.view = view
    this.model = model
    this.initinizer()
    this.bindEvents()
}
Object.assign(ContactorPresenter.prototype, {
    initinizer () {
        let listdata = this.model.getAllContatcors()
        this.view.render(listdata)
    },
    bindEvents () {
        observer.subscribe('view.add.contactor', (contactor) => {
            this.model.addContactor(contactor)
        })
        observer.subscribe('view.delete.contactor', (contactor) => {
            this.model.removeContactor(contactor)
        })
        // 订阅模型发布的消息
        observer.subscribe('model.add.contactor', (contactor) => {
            this.view.addContactor(contactor)
        })
        // 订阅模型发布的消息
        observer.subscribe('model.delete.contactor', (contactor) => {
            this.view.removeContactor(contactor)
        })
    }
})