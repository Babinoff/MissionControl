/**
 * Created by konrad.sobon on 2018-01-09.
 */
angular.module('MissionControlApp').controller('VrController', VrController);

function VrController($routeParams, VrFactory, ProjectFactory, dragulaService, $rootScope, $scope, $window, $uibModal, UtilityService){
    var vm = this;
    vm.projectId = $routeParams.projectId;
    vm.selectedProject = null;
    vm.popoverOptions = {
        placement: 'top',
        triggers: 'click, outsideClick',
        templateUrl: 'editName.html'
    };
    vm.editingBucket = false;
    vm.buckets = [];
    vm.images = [];

    // (Konrad) Retrieves selected project from MongoDB.
    getSelectedProject(vm.projectId);

    // $scope.$on('image_bag.remove-model', function (el, container, source) {
    //     // var deletedId = container[0].id;
    //     // console.log("deletedId:" + deletedId);
    // });
    //
    // $scope.$on('image_bag.drop-model', function (el, target, source, sibling) {
    //     // var addedId = source.context.children()[0].id;
    //     // console.log("addedId:" + addedId);
    // });

    //(Konrad) Options for the dragula bags
    dragulaService.options($scope, 'image_bag', {
        removeOnSpill: true, // removes the object when dragged outside of box
        copy: function (el, source) {
            return source.id.match('#images') //we only allow copy from "images" into "buckets"
        },
        moves: function (el, source, handle, sibling) {
            return handle.className === 'handle glyphicon glyphicon-move'; //only drag elements with this class
        },
        accepts: function (el, target, source, sibling) {
            return source.id === '#images' && target.id === '#bucket'; // only allow images from "images to be dragged into buckets"
        }
    });

    /**
     * Adds new bucket.
     */
    vm.addBucket = function(){
        //TODO: Post to DB.
        //TODO: _id will be that of the posted element.
        vm.buckets.push({
            name: "Bucket " + (vm.buckets.length + 1),
            images: [],
            sharableLink: null,
            sharedWith: [],
            _id: UtilityService.guid(),
            editingBucket: false
        })
    };

    /**
     *
     * @param bucket
     */
    vm.deleteBucket = function (bucket) {
        var idx = vm.buckets.indexOf(bucket);
        vm.buckets.splice(idx, 1);
        //TODO: remove from DB.
    };

    /**
     * Moves bucket panel up.
     * @param index
     * @param arr
     */
    vm.moveUp = function (index, arr) {
        UtilityService.move(arr, index, index-1);
    };

    /**
     * Moves bucket panel down.
     * @param index
     * @param arr
     */
    vm.moveDown = function (index, arr) {
        UtilityService.move(arr, index, index+1);
    };

    /**
     * Checks if bucket can be moved up.
     * @param index
     * @returns {boolean}
     */
    vm.showUpArrow = function (index) {
        return index > 0;
    };

    /**
     * Checks if bucket can be moved down.
     * @param index
     * @returns {boolean}
     */
    vm.showDownArrow = function (index) {
        return index < vm.buckets.length - 1;
    };

    /**
     * Watches Images collection for changes.
     */
    $scope.$watchCollection('vm.images', function (newValue, oldValue, scope) {
        if(newValue.length > oldValue.length){
            //TODO: Post new image to DB
            // console.log("Image added: " + newValue.diff(oldValue)[0].name);
        } else if(newValue.length < oldValue.length){
            //TODO: Remove image from DB
            // console.log("Image removed: " + oldValue.diff(newValue)[0].name);
        }
    });

    /**
     * Watches buckets collections for changes.
     */
    $scope.$watch('vm.buckets', function (newValue, oldValue, scope) {
        // (Konrad) Since we are deep watchingg this collection
        // any changes to the sub-arrays will trigger this
        // We can use that to prevent duplicates from being added to bucket.
        if(newValue.length === oldValue.length){
            vm.buckets.forEach(function(bucket){
                bucket.images = UtilityService.removeDuplicates(bucket.images, '_id');
            });
        }
        if(newValue.length > oldValue.length){
            //TODO: Post new bucket to DB
            // console.log("Bucket added: " + newValue.diff(oldValue)[0].name);
        } else if(newValue.length < oldValue.length){
            //TODO: Remove bucket from DB
            // console.log("Bucket removed: " + oldValue.diff(newValue)[0].name);
        }
    }, true);

    /**
     * Shows modal window for input of image properties.
     * @param size
     * @param image
     */
    vm.editImage = function (size, image) {
        $uibModal.open({
            animation: true,
            templateUrl: 'angular-app/vr/edit-image.html',
            controller: 'EditImageController as vm',
            size: size,
            resolve: {
                image: function (){
                    return image;
                }}
        }).result.then(function(request){
            if(!request) return;
            if(vm.buckets.length === 0) return;

            // (Konrad) Since dragula makes a copy of the image, when it's moved to
            // a bucket, we need to track them down and update if name/desc changed.
            vm.buckets.forEach(function (bucket) {
                bucket.images.forEach(function (image) {
                    if(image._id.toString() === request.response._id.toString()){
                        image.displayName = request.response.displayName;
                        image.description = request.response.description;
                    }
                });
            });

        }).catch(function(){
            console.log("All Tasks Dialog dismissed...");
        });
    };

    /**
     * Removes selected image from bucket only.
     * @param file
     * @param bucket
     */
    vm.deleteFromBucket = function (file, bucket) {
        var index = bucket.images.findIndex(function (image) {
            return image._id.toString() === file._id.toString();
        });
        if(index !== -1) bucket.images.splice(index, 1);
    };

    /**
     * Removes selected image from Images and ALL buckets.
     * @param file
     */
    vm.deleteFromImages = function (file) {
        var index = vm.images.findIndex(function (item) {
            return item._id.toString() === file._id.toString();
        });
        if(index !== -1) vm.images.splice(index, 1);

        vm.buckets.forEach(function (bucket) {
            var index2 = bucket.images.findIndex(function (image) {
                return image._id.toString() === file._id.toString();
            });
            if(index2 !== -1) bucket.images.splice(index2, 1);
        });
    };

    /**
     * Used to retrieve the Project info.
     * Also, parses through sheets/sheetsChanges to populate DataTable.
     * @param projectId
     */
    function getSelectedProject(projectId) {
        ProjectFactory.getProjectById(projectId)
            .then(function(response){
                if(!response || response.status !== 200) return;

                vm.selectedProject = response.data;
                return VrFactory.getProject(vm.selectedProject.number + ' ' + vm.selectedProject.name)
            })
            .then(function (response) {
                if(!response || response.status === 204){
                    // (Konrad) Request was successful but no projects were found in Trimble.
                    // Let's make another request to create a new project in Trimble.
                    return VrFactory.createProject(vm.selectedProject.number + " " + vm.selectedProject.name)
                } else {
                    // (Konrad) Project was found
                    console.log("Project found. Name: " + response.data[0].name);
                }
            })
            .then(function (response) {
                if(!response) return;
            })
            .catch(function (err) {
                console.log(err);
            });
    }
}