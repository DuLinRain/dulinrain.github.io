/*
* @Author: Marte
* @Date:   2018-01-19 14:59:13
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-21 13:21:15
*/

'use strict';
function ContactorView(views = []) {
    this.views = views
}
ContactorView.prototype = {
    render (listdata) {
        for (let view of this.views) {
            view.render(listdata)
        }
    },
    addContactor (contactor) {
        for (let view of this.views) {
            view.addContactor(contactor)
        }
    },
    removeContactor (contactor) {
        for (let view of this.views) {
            view.removeContactor(contactor)
        }
    }
}