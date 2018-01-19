/*
* @Author: Marte
* @Date:   2018-01-19 15:03:21
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-19 15:59:51
*/

'use strict';
function ContactorController (view, model) {
    this.view = view
    this.model = model
    this.initinizer()
    this.bindEvents()
}
Object.assign(ContactorController.prototype, {
    initinizer () {
        let listdata = this.model.getAllContatcors()
        this.view.render(listdata)
    },
    bindEvents () {
        observer.subscribe('view.add.contactor', (contactor) => {
            this.addContactor(contactor)
        })
        observer.subscribe('view.delete.contactor', (contactor) => {
            this.removeContactor(contactor)
        })
    },
    addContactor (contactor) {
        this.model.addContactor(contactor)
    },
    removeContactor (contactor) {
        this.model.removeContactor(contactor)
    }
})