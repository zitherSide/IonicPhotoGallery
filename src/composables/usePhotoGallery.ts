import { ref, onMounted, watch } from 'vue'
import { Plugins, CameraResultType, CameraSource, CameraPhoto,
         Capacitor, FilesystemDirectory } from "@capacitor/core"

const photos = ref<Photo[]>([])

export function usePhotoGallery(){
    const {Camera} = Plugins
    const takePhoto = async () => {
        console.log("take photo")
        const cameraPhoto = await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        })

        const filename = new Date().getTime() + '.jpg'
        const savedFileImage = {
            filepath: filename,
            webviewPath: cameraPhoto.webPath
        }

        console.log("webviewpath: " + savedFileImage.webviewPath)
        photos.value = [savedFileImage, ...photos.value]
    }

    return {
        photos,
        takePhoto
    }
}

export interface Photo{
    filepath: string;
    webviewPath?: string;
}