import streamlit as st
import google.generativeai as genai

# 获取 API Key
# 注意：你需要稍后在 Streamlit 后台 Secrets 里配置 GOOGLE_API_KEY
api_key = st.secrets.get("GOOGLE_API_KEY")

st.title("我的 AI 助手")

if not api_key:
    st.error("请先在 Streamlit 设置里配置 GOOGLE_API_KEY")
    st.stop()

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-pro')

# 初始化聊天记录
if "messages" not in st.session_state:
    st.session_state.messages = []

# 显示历史消息
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 接收用户输入
if prompt := st.chat_input("说点什么..."):
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.messages.append({"role": "user", "content": prompt})

    try:
        response = model.generate_content(prompt)
        with st.chat_message("assistant"):
            st.markdown(response.text)
        st.session_state.messages.append({"role": "assistant", "content": response.text})
    except Exception as e:
        st.error(f"出错了: {e}")
