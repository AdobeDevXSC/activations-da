document.addEventListener("DOMContentLoaded", function () {
            const video = document.querySelector('video');

            if (video) {
                video.removeAttribute('controls');

                video.autoplay = true;
                video.loop = true;
                video.muted = true;
            }
        });