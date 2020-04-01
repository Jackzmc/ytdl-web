import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import Buefy from 'buefy'
import 'buefy/dist/buefy.css'

Vue.use(Buefy)
Vue.prototype.$useHost = process.env.VUE_APP_API_USE_HOST;
Vue.prototype.$apiURL = process.env.VUE_APP_API_URL;
Vue.prototype.$regex = process.env.VUE_APP_YT_REGEX;
Vue.prototype.$version = require('../package.json').version
Vue.config.productionTip = false

new Vue({
  render: h => h(App)
}).$mount('#app')
