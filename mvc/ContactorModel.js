/*
* @Author: Marte
* @Date:   2018-01-19 14:14:38
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-19 16:03:43
*/

'use strict';
function ContactorModel (contactors = []) {
    this.contactors = contactors
}
Object.assign(ContactorModel.prototype, {
    getAllContatcors () {
        return this.contactors
    },
    addContactor (contactor) {
        this.contactors.unshift(contactor)
        observer.publish('model.add.contactor', contactor)
    },
    removeContactor (contactor) {
        this.contactors = this.contactors.filter(x => x !== contactor)
        observer.publish('model.delete.contactor', contactor)
    }
})