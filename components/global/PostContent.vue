<template>
  <div class="container">
    <div class="columns">
      <div class="column is-8-desktop is-offset-2-desktop">
        <div class="content my-5 mx-2 is-family-code">
          <h1 class="title">{{ post.title }}</h1>
          <nuxt-content :document="post" />
          <p class="mt-6">{{ formatDate(post.date) }} by valentinmk</p>
          <p class="mt-6 is-size-7">
            Post last updated: {{ formatDate(post.updatedAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'PostContent',
  props: {
    post: {
      type: Object,
      required: true,
    },
  },
  methods: {
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' }
      return new Date(date).toLocaleDateString('en', options)
    },
  },
}
</script>

<style scoped>
.icon.icon-link {
  background-image: url('~assets/svg/icon-hashtag.svg');
  display: inline-block;
  width: 20px;
  height: 20px;
  background-size: 20px 20px;
}
</style>
