<template>
  <div id="app" class="container">
    <span class="has-text-centered">
    <p class="title is-1">Youtube Video Downloader</p>
    <div class="has-text-centered">
    <b-tooltip label="Drag to bookmark bar to quickly download videos" >
      <a class="subtitle is-4 bookmarklet" href="javascript:(function(){s=document.createElement('script');s.type='text/javascript';s.src='https://ytdl.jackz.me/js/bookmarklet.js?v='+parseInt(Math.random()*999);document.body.appendChild(s);})();">Bookmarklet</a>
    </b-tooltip>
    </div>
    <br>
    <form @submit.prevent="fetchVideo">
    <b-field label="Enter a YouTube URL">
        <b-input
          placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ"
          :loading="loading"
          size="is-large"
          v-model="url"
          type="url"
          :pattern="$regex"
          required
          validation-message="Please enter a valid youtube.com/watch?v= or youtu.be url"
        ></b-input>
    </b-field>
    </form>
    </span>
    <hr>
    <b-loading :active="loading" />
    <div v-if="video.id">
      <figure class="image is-128x128 is-inline-block is-pulled-left">
        <img :src="video.thumbnail_url" />
      </figure>
      <span class="is-inline has-text-centered">
      <p class="title is-4">{{video.title}}</p>
      <p class="subtitle is-6">Uploaded by <b>{{video.uploader}}</b></p>
      </span>
      <br><br>
      <div class="container" style="width:50%">
        <b-field label="Quality">
            <b-select v-model="quality" size="is-large" expanded="">
                <option
                    v-for="(option) in qualities"
                    :value="option.id"
                    :key="option.id">
                    {{ option.quality }} <span v-if="!$options.RECM_QUALITY.includes(option.quality)">[HD]</span>
                </option>
            </b-select>
        </b-field>
        <div class="buttons">
          <b-button @click="downloadVideo" type="is-primary is-large">Download MP4</b-button>
          <b-button @click="downloadAudio" type="is-primary is-large">Download Audio</b-button>
        </div>
        <p>Notice: HD Video Downloads may be throttled or limited. Non-HD (480p and less) and audio downloads will not be limited.</p>
      </div>
      
    </div>
    <footer class="ytdl-footer" v-if="video.id">
      youtube-dl version {{ytdl_version}} - Build Date {{buildDate}} - v{{$version}} UI - v{{server_version}} Server
    </footer>
  </div>
</template>

<script>
import Axios from 'axios'
//import downloadjs from 'downloadjs'
export default {
  name: 'App',
  API_URL:null,
  RECM_QUALITY: ["144p","240p","360p","480p"],
  computed:{
    qualities() {
      const qualities = [];
      const filtered = [];
      this.video.formats.filter(v => v.ext === 'mp4')
      .forEach(({quality,id}) => {
        if(!qualities.includes(quality)) {
          qualities.push(quality)
          filtered.push({quality,id})
        }
      })
      return filtered.sort((a,b) => parseInt(a) - parseInt(b))
    },
    buildDate() {
      return document.documentElement.dataset.buildTimestampUtc;
    }
  },
  data() {
    return {
      url:null,
      video:{
        id:null,
        title:null,
        uploader:null,
        thumbnail_url:null,
      },
      ytdl_version:null,
      server_version:null,
      quality:"144p",
      loading: false
    }
  },
  components: {
  },
  created() {
    if(this.$useHost) {
      this.$options.API_URL = '';
    }else{
      this.$options.API_URL = this.$apiURL
    }
  },
  mounted() {
    this.$options.REGEX = new RegExp(this.$regex)
    console.debug('API_URL =',this.$options.API_URL)

    const hash = window.location.hash.substr(1);
    if(!hash || hash == "") {
      window.location.hash = "#"
    }else{
      console.debug('Fetching video from anchor',hash)
      this.url = hash;
      this.fetchVideo();
    }
    window.addEventListener('hashchange',() => {
      const hash = window.location.hash.substr(1);
      if(hash != "" && hash !== this.url) {
        this.url = hash;
        this.fetchVideo();
      }
    })
  },
  methods:{
    findNiceQuality() {
      //loops this.qualities, finds first good non-HD (720p+) video
      this.quality = this.qualities.slice().reverse().find(v => this.$options.RECM_QUALITY.includes(v.quality)).id
    },
    downloadVideo() {
      location.href = `${this.$options.API_URL}/download/video/${this.video.id}?quality=${this.quality}`
    },
    downloadAudio() {
      location.href = `${this.$options.API_URL}/download/audio/${this.video.id}`
    },
    fetchVideo() {
      
      window.location.hash = '#' + this.url
      if(!this.$options.REGEX.test(this.url)) {
        this.$buefy.dialog.alert({
            title: 'Invalid URL',
            message: 'An invalid url was provided. Please make sure it is either a <b>youtube.com/watch?v=</b> link or an <b>youtu.be/</b> link.',
            type: 'is-danger',
            ariaRole: 'alertdialog',
            ariaModal: true
        })
        return;
      }
      this.loading = true;
      Axios.get(`${this.$options.API_URL}/fetch/${encodeURIComponent(this.url)}`)
      .then(({data,headers}) => {
        this.video = data;
        console.log(headers)
        this.ytdl_version = headers['x-ytdl-version']
        this.server_version = headers['x-server-version'];
        this.findNiceQuality();
      }).catch(err => {
        const message = err.response&&err.response.data ? err.response.data?.error : err.message;
        this.$buefy.dialog.alert({
            title: 'Failed to Fetch Video',
            message: '<b>Server returned an error. </b><br>' + message,
            type: 'is-danger',
            ariaRole: 'alertdialog',
            ariaModal: true
        })
      }).finally(() => this.loading = false)
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /*text-align: center;*/
  color: #2c3e50;
  margin-top: 60px;
}
.ytdl-footer {
  position: fixed;
  left: 0;
  bottom: 0;
  width: 100%;
  text-align: center;
}
.bookmarklet {
  border-radius: 3px;
  border: none;
  margin: 5px;
  width: 100%;
  display: inline-block;
  padding: 2px 15px;
  text-decoration: none;
  box-shadow: inset 0 1px 1px #999, inset 0 2px 2px #fff, inset 0 -5px 30px -15px #666;
  
}
</style>
