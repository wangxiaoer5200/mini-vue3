/**
 * reactive
 * 1.接受一个参数，判断是否是对象
 * 2.创建拦截器对象handler，设置get、set、deleteProperty
 * 3.返回Proxy对象
 */

const isObject = obj => obj !== null && typeof obj === 'object'
// 递归如果get的为对象
const convert = target =>  isObject(target) ? reactive(target) : target
// 判断object是否含有key
const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key)

// reactive
export function reactive (target) {
    if (!isObject) return target

    const handler = {
        // 获取
        get (target, key, receiver) {
            // 收集依赖
            track(target, key)
            const result =  Reflect.get(target, key, receiver)
            return convert(result)
        },
        // 设置
        set (target, key, value, receiver) {
            const oldValue = Reflect.get(target, key, receiver)
            let result = true
            // 判断oldValue是否和value相同
            if (oldValue !== value) {
                result = Reflect.set(target, key, value, receiver)
                // 触发更新
                trigger(target, key)
            } 
            return result
        },
        // 删除
        deleteProperty (target, key) {
            const hasKey = hasOwn(target, key)
            const result = Reflect.deleteProperty(target, key)
            if (hasKey && result) {
                // 触发更新
                trigger(target, key)
            }
            return result
        }
    }
    return new Proxy(target, handler)
}

// effect
let activeEffect = null
export function effect(callback) {
    activeEffect = callback
    callback()
    activeEffect = null
}

let targetMap = new WeakMap()
// 收集依赖
export function track (target, key) {
    if (!activeEffect) return
    let depsMap = targetMap.get(target)
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
        depsMap.set(key, (dep = new Set()))
    }
    dep.add(activeEffect)
}

// 触发更新
export function trigger (target, key) {
    let depsMap = targetMap.get(target)
    if (!depsMap) return
    let dep = depsMap.get(key)
    if (dep) {
        dep.forEach(effect => {
            effect()
        })
    } 
}

// ref
export function ref (raw) {
    // raw已经为ref对象，直接return
    if (isObject(raw) && raw.__v_isRef) {
        return 
    }
    // 如果raw里面的对象为对象，递归raw
    let value = convert(raw)
    const r = {
        __v_isRef: true,
        get value() { // 调用 r.value 时触发
            track(r, 'value') // 收集依赖
            return value
        },
        set value (newValue) { // 赋值 r.value 时触发
            if (newValue !== value) {
                value = convert(newValue)
                trigger(r, 'value')
            }
        }
    }
    return r
}

// toRefs
export function toRefs (proxy) {
    // 判断proxy是数组还是对象
    const ret = proxy instanceof Array ? new Array(proxy.length) : {}
    for (let key in proxy) {
        ret[key] = toProxyRef(proxy, key)
    }
    return ret
}

function toProxyRef (proxy, key) {
    const r = {
        __v_isRef: true,
        get value() { // 因为之前已经收集依赖了因此不需要
            return proxy[key]
        },
        set value(newValue) {
            proxy[key] = newValue
        }
    }
    return r
}

// computed
export function computed (getter) {
    const result = ref() // 空ref

    effect(() => (result.value = getter())) // 将getter的值赋值给result.value

    return result
}