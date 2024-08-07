import streamlit as st
import time, requests, json, re
import dotenv
import os

from pathlib import Path

if 'authentication_status' in st.session_state and st.session_state["authentication_status"]:
    # get username
    username = st.session_state["username"]
    script_path = Path(__file__).resolve()
    current_dir = script_path.parent

    dotenv.load_dotenv(os.path.join(current_dir,'../.env'))
    domain_url = st.session_state.domain_url  if 'domain_url' in st.session_state else os.environ['domain_url']
    api_key = st.session_state.api_key  if 'api_key' in st.session_state else os.environ['apikeys']
    st.text("Current User:")
    st.text(username)

    user_settings_url = domain_url + "/discord-secrets/" + username
    user_headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    user_response = requests.request("GET", user_settings_url, headers=user_headers, data={})

    raw_settings = json.loads(user_response.text)
    channel_id = st.text_area(
        "Enter Channel ID (required)",
        placeholder="input channel id",
        key='channel_id',
        value=raw_settings["CHANNEL_ID"] if "CHANNEL_ID" in raw_settings and raw_settings["CHANNEL_ID"] else ""
    )

    token = st.text_area(
        "Enter token👇 (required)",
        key="token👇",
        height=12,
        placeholder="input discord token",
        value=raw_settings["TOKEN"] if "TOKEN" in raw_settings and raw_settings["TOKEN"] else ""
    )

    running_cycle = st.text_area(
        "Running Cycle👇 (required)",
        key="running_cycle",
        height=12,
        placeholder="Running Cyle, please input cron expression: like cron(0 12 * * ? *), UTC +0 Timezone",
        value=raw_settings["RUNNING_CYCLE"] if "RUNNING_CYCLE" in raw_settings and raw_settings["RUNNING_CYCLE"] else ""
    )

    data_period = st.text_area(
        "Enter Data Period👇 (required, Unit: Day)",
        placeholder=
        """
        Data Collect period like 1,2,3
        """,
        key='data_period',
        value=raw_settings["DATA_PERIOD"] if "DATA_PERIOD" in raw_settings and raw_settings["DATA_PERIOD"] else ""
    )

    if st.button('提交'):
        if channel_id.strip() == "":
            st.write("channel_id cannot be empty！")

        if token.strip() == "":
            st.write("token cannot be empty！")

        if running_cycle.strip() == "":
            st.write("running_cycle cannot be empty！")
        
        if data_period.strip() == "":
            st.write("data_period cannot be empty！")

        url = domain_url + "/discord-secrets"

        payload = json.dumps({
        "channel_id": channel_id,
        "token": token,
        "running_cycle": running_cycle,
        "data_period": data_period,
        "username": username,
        })
        headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
        }

        response = requests.request("POST", url, headers=headers, data=payload)

        if response.status_code == 200:
            st.success('Submit success!', icon="✅")
        else:
            st.error(f'Submit failed with code:{response.status_code} message:{response.content}')
else:
   st.error("please login first")