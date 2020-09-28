<template>
  <div class="container">
    <div class="box">
      <nuxt-content :document="side" />
      <p><i>Tags:</i></p>
      <NuxtLink
        v-for="tag of getUniqueTags(posts)"
        :key="tag"
        :to="{
          name: 'index',
          query: { tag: tag },
        }"
      >
        <span :class="tagClass[tag.trim().charCodeAt(0) % 10] + ' mr-2'">
          {{ tag }}
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
<script>
export default {
  name: 'SidePanel',
  props: {
    side: {
      type: Object,
      required: true,
    },
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
    getUniqueTags: (posts) => {
      const taglines = posts.map((v) => v.tags)
      return Array.from(
        new Set(taglines.flatMap((v) => v.split(',').map((vv) => vv.trim())))
      )
    },
  },
}
</script>
<style>
p {
  margin-top: 12px;
}
</style>
