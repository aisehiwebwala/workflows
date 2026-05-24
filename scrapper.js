const fs = require("fs")
const dotenv = require("dotenv")
dotenv.config()
const { album_lists, song_lists, artist_lists } = require("./tokens")

const complete_data = []
const song_ids = new Set()
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

const uploadFile = async (body) => {
    try {
        const response = await fetch(`${P_URL}/file/records.json`, {
            method: "PUT", body: JSON.stringify(body),
            headers: {
                "Authorization": "Basic " + btoa(":" + P_KEY)
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
        "album_id": full_data?.more_info?.album_id,
        "duration": full_data?.more_info?.duration,
        "artists": full_data?.more_info?.artistMap?.primary_artists.map((val) => val.name),
        "download_url": generateDownloadURLS(await getDownloadURL(full_data?.more_info?.encrypted_media_url))
    }
}

const addData = (dets) => {
    try {
        if (song_ids.has(dets?.id)) return
        song_ids.add(dets?.id)
        complete_data.push(dets)
    } catch (error) {
        console.log(`Error : ${error.message} : ${dets?.title}`)
    }
}

const saveSong = async (token) => {
    try {
        const response = await fetch(`${BASE_URL}?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${token}&type=song`)
        const json_response = await response.json()
        const song_details = await getSongDetails(json_response.songs[0])
        addData(song_details)
    } catch (error) {
        console.log(error.message)
    }
}

const saveAlbum = async (token) => {
    try {
        const response = await fetch(`${BASE_URL}?__call=webapi.get&api_version=4&_format=json&_marker=0&ctx=web6dot0&token=${token}&type=album`)
        const json_response = await response.json()
        const song_details = await Promise.all(json_response.list.map((val) => {
            return getSongDetails(val)
        }))
        for (const dets of song_details) {
            addData(dets)
        }
    } catch (error) {
        console.log(error.message)
    }
}

const saveArtist = async (token) => {
    try {
        const response = await fetch(`https://www.jiosaavn.com/api.php?__call=webapi.get&token=${token}&type=artist&p=0&n_song=50&n_album=50&sub_type=&category=&sort_order=asc&includeMetaTags=0&ctx=web6dot0&api_version=4&_format=json&_marker=0`)
        const json_response = await response.json()
        const albums_data = json_response.topAlbums;
        for (const { perma_url } of albums_data) {
            await saveAlbum(perma_url.split("/").pop())
        }
    } catch (error) {
        console.log(error.message)
    }
}

const createRecord = async () => {
    const a_l = [...new Set(album_lists)]
    const s_l = [...new Set(song_lists)]
    const ar_l = [...new Set(artist_lists)]

    try {
        for (const token of a_l) {
            await saveAlbum(token)
        }
        for (const token of s_l) {
            await saveSong(token)
        }
        for (const token of ar_l) {
            await saveArtist(token)
        }

        fs.writeFileSync("records.json", JSON.stringify(complete_data))
        console.log(`Done : ${complete_data.length}`)
    } catch (error) {
        console.log(error.message)
    }
}

createRecord()