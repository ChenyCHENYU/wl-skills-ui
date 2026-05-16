<template>
  <div>
    <table>
      <tr><td>数据</td></tr>
    </table>
    <input type="text" v-model="name" />
    <select v-model="type">
      <option value="a">A</option>
    </select>
    <button @click="submit">提交</button>
    <textarea v-model="remark"></textarea>
  </div>
</template>
