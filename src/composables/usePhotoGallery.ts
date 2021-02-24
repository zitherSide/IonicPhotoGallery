import { ref, onMounted, watch, resolveComponent } from 'vue'
import { Plugins, CameraResultType, CameraSource, CameraPhoto,
         Capacitor, FilesystemDirectory, Filesystem, Camera } from "@capacitor/core"
import { isPlatform } from '@ionic/vue'

const photos = ref<Photo[]>([])
const PHOTO_STORAGE = "photos"

const convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader
    reader.onerror = reject
    reader.onload = () => { resolve(reader.result) }
    reader.readAsDataURL(blob)
})

const savePicture = async (photo: CameraPhoto, filename: string): Promise<Photo> => {
    let base64Data: string
    if(isPlatform('hybrid')){   //mobile
        const file = await Filesystem.readFile({
            path: photo.path!
        })
        base64Data = file.data
    }else{
        const response = await fetch(photo.webPath!)
        const blob = await response.blob()
        base64Data = await convertBlobToBase64(blob) as string
    }

    const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: FilesystemDirectory.Data
    })

    if(isPlatform('hybrid')){
        return {
            filepath: savedFile.uri,
            webviewPath: Capacitor.convertFileSrc(savedFile.uri)    //mobileならwebviewPathに変換
        }
    }else{
        return {
            filepath: filename,
            webviewPath: photo.webPath
        }
    }
}

export function usePhotoGallery(){
    const { Camera, Filesystem, Storage } = Plugins
    const photos = ref<Photo[]>([])
    const PHOTO_STORAGE = "photos"

    const takePhoto = async () => {
        const cameraPhoto = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        })

        const filename = new Date().getTime() + '.jpeg'
        const savedFileImage = await savePicture(cameraPhoto, filename)

        console.log("webviewpath: " + savedFileImage.webviewPath)
        photos.value = [savedFileImage, ...photos.value]
    }

    const cachePhotos = () => {
        Storage.set({
            key: PHOTO_STORAGE,
            value: JSON.stringify(photos.value)
        })
    }

    watch(photos, cachePhotos)
    
    const loadSaved = async () => {
        const photoList = await Storage.get({key: PHOTO_STORAGE})
        const photosInStorage = photoList.value ? JSON.parse(photoList.value) : []
        
        if(!isPlatform('hybrid')){
            for(const photo of photosInStorage){
                const file = await Filesystem.readFile({
                    path: photo.filepath,
                    directory: FilesystemDirectory.Data
                })
                photo.webviewPath = `data:image/jpeg;base64,${file.data}`
            }
        }
        
        photos.value = photosInStorage
    }
    onMounted(loadSaved)
    
    const deletePhoto = async (photo: Photo) => {
        photos.value = photos.value.filter(p => p.filepath !== photo.filepath)
        const filename = photo.filepath.substr(photo.filepath.lastIndexOf('/') + 1)
        await Filesystem.deleteFile({
            path: filename,
            directory: FilesystemDirectory.Data
        })
    }
    
    return {
        photos,
        takePhoto,
        deletePhoto
    }
}

export interface Photo{
    filepath: string;
    webviewPath?: string;
}