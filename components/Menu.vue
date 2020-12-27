<template>
  <nav
    class="navbar is-link is-fixed-top"
    role="navigation"
    aria-label="main navigation is-family-code"
  >
    <div class="navbar-brand">
      <a class="navbar-item" href="https://valentinmk.github.io/blog">
        <img
          src="https://avatars2.githubusercontent.com/u/12662946?s=460&u=e3e6eba7ee0cf32e7400284b4fce0fe872170f74&v=4"
          height="32"
          alt="valentinmk@github"
        />
      </a>
      <a
        :class="{ 'is-active': isOpen }"
        role="button"
        class="navbar-burger"
        aria-label="menu"
        aria-expanded="false"
        @click="isOpen = !isOpen"
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>

    <div class="navbar-menu" :class="{ 'is-active': isOpen }">
      <div class="navbar-start is-family-code">
        <nuxt-link to="/" class="navbar-item">Home</nuxt-link>
        <nuxt-link to="/posts" class="navbar-item">Posts</nuxt-link>
        <div class="navbar-item has-dropdown is-hoverable">
          <a class="navbar-link">More</a>
          <div class="navbar-dropdown">
            <nuxt-link to="/about" class="navbar-item">About</nuxt-link>
            <nuxt-link to="/contact" class="navbar-item">Contact</nuxt-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
<script>
export default {
  data() {
    return {
      isOpen: false,
    }
  },
}
</script>
<style scoped></style>
