<template>
  <div class="container">
    <div class="columns">
      <div class="column">
        <div class="content mt-5">
          <AppSearchInput />
          <div
            v-for="post of posts"
            :key="post.slug"
            class="box is-family-code"
          >
            <img v-if="post.img" :src="post.img" />
            <div class="container">
              <div class="columns">
                <div class="column is-7-desktop is-6-mobile">
                  <div class="content">
                    <div>
                      <NuxtLink
                        :to="{
                          name: 'posts-slug',
                          params: { slug: post.slug },
                        }"
                      >
                        <h2>{{ post.title }}</h2>
                      </NuxtLink>
                    </div>
                  </div>
                </div>
                <div class="column is-5-desktop is-6-mobile">
                  <div class="content is-pulled-right">
                    <p>{{ formatDate(post.date) }} by {{ post.author }}</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="content">
              <p>{{ post.description }}</p>
              <nav class="level is-mobile mt-3">
                <div class="level-left">
                  <p>
                    <span
                      v-for="tag of parseTags(post.tags)"
                      :key="tag"
                      :class="tagClass[tag.trim().charCodeAt(0) % 10] + ' mr-2'"
                    >
                      {{ tag }}
                    </span>
                  </p>
                </div>
                <div class="level-right">
                  <NuxtLink
                    :to="{
                      name: 'posts-slug',
                      params: { slug: post.slug },
                    }"
                  >
                    Read more {{ post.title.split(' ')[0] + '...' }}
                    <span class="icon is-small">
                      <fa-icon icon="angle-double-right" transform="down-4" />
                    </span>
                  </NuxtLink>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: 'PostsList',
  props: {
    posts: {
      type: Array,
      required: true,
    },
  },
  data: () => {
    return {
      tagClass: [
        'tag is-black',
        'tag is-dark',
        'tag is-light',
        'tag is-white',
        'tag is-primary',
        'tag is-link',
        'tag is-info',
        'tag is-success',
        'tag is-warning',
        'tag is-danger',
      ],
    }
  },
  methods: {
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' }
      return new Date(date).toLocaleDateString('en', options)
    },
    parseTags(tags) {
      return tags.split(',')
    },
  },
}
</script>
