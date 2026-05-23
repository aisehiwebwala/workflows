const fs = require("fs")
const dotenv = require("dotenv")
dotenv.config()
const {album_lists, song_lists} = require("./tokens")

const complete_data = []
const BASE_URL = process.env.BASE_URL

const P_URL = process.env.P_URL
const P_KEY = process.env.P_KEY

const getDownloadURL = async (url) => {
    try {
        url = encodeURIComponent(url)
        const response = await fetch(`${BASE_URL}?__call=song.generateAuthToken&url=${url}&bitrate=320&api_version=4&_format=json&ctx=web6dot0&_marker=0`)
        const response_json = await response.json()
        let download_url = response_json.auth_url
        return download_url.split("?")[0].replace("web", "aac")
    } catch (error) {
        return ""
    }
}

const uploadFile = async(body)=>{
    try {
        const response = await fetch(`${P_URL}/file/records.json`,{method:"PUT",body:JSON.stringify(body),
            headers:{
                "Authorization": "Basic "+btoa(":"+P_KEY)
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

const generateDownloadURLS = (download_url) => {
    return {
        "320": download_url,
        "160": download_url.replace("320", "160"),
        "96": download_url.replace("320", "96")
    }
}

const getSongDetails = async (full_data) => {
    return {
        "id": full_data?.id,
        "title": full_data?.title,
        "language": full_data?.language,
        "year": full_data?.year,
        "image": full_data?.image,
        "album": full_data?.more_info?.album,
        "album_id":full_data?.more_info?.album_id,
        "duration": full_data?.more_info?.duration,
        "artists": full_data?.more_info?.artistMap?.primary_artists.map((val) => val.name),
        "download_url": generateDownloadURLS(await getDownloadURL(full_data?.more_info?.encrypted_media_url))
    }
}

const saveSong = async (token) => {
    try {
        const response = await fetch(`${BASE_URL}?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${token}&type=song`)
        const json_response = await response.json()
        const song_details = await getSongDetails(json_response.songs[0])
        complete_data.push(song_details)
    } catch (error) {
        console.log(error.message)
    }
}

const saveAlbum = async (token) => {
    try {
        const response = await fetch(`${BASE_URL}?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${token}&type=album`)
        const json_response = await response.json()
        song_details = await Promise.all(json_response.list.map((val) => {
            return getSongDetails(val)
        }))
        complete_data.push(...song_details)
    } catch (error) {
        console.log(error.message)
    }
}

const createRecord = async () => {
    a_l = [...new Set(album_lists)]
    s_l = [...new Set(song_lists)]
    
    try {
        for (const token of a_l) {
            await saveAlbum(token)
        }
        for (const token of s_l) {
            await saveSong(token)
        }
        fs.writeFileSync("records.json", JSON.stringify(complete_data))
        console.log(`Done : ${complete_data.length}`)
    } catch (error) {
        console.log(error.message)
    }
}

createRecord()