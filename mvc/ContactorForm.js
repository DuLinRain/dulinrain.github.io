/*
* @Author: Marte
* @Date:   2018-01-19 14:16:17
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-19 17:50:20
*/

'use strict';
function ContactorForm () {
    this.input = document.createElement('input')
    this.button = document.createElement('button')
    this.input.setAttribute('type', 'text')
    this.input.setAttribute('placeholder', '请输入联系人')
    this.button.innerHTML = '增加'
}

Object.assign(ContactorForm.prototype, {
    render () {
        document.body.appendChild(this.input)
        document.body.appendChild(this.button)
        this.bindEvents()
    },
    bindEvents () {
        this.button.addEventListener('click', (e) => {
            let value = this.input.value
            if (value === '') {
                return
            }
            observer.publish('view.add.contactor', value)
        })
        observer.subscribe('model.add.contactor', () => {
            this.clearField()
        })
    },
    clearField () {
        this.input.value = ''
    }
})